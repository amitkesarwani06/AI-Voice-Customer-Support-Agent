import os
import json
from google import genai
from google.genai import types
from prompts import SYSTEM_PROMPT
from tools import available_functions
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-flash-latest"

# Define the tool for Gemini
order_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="get_order_details",
            description="Search the order database for details about a specific order. Use this when the customer asks about an order status, tracking, cancellation, or return for a specific order.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "order_id": types.Schema(
                        type=types.Type.STRING,
                        description="The order ID to look up, e.g. 'ORD-101'"
                    )
                },
                required=["order_id"]
            )
        )
    ]
)


async def process_chat(messages: list) -> str:
    """Process a chat turn with Gemini, handling tool calls if needed."""
    
    try:
        # Convert frontend messages to Gemini format
        contents = []
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user" and content:
                contents.append(
                    types.Content(role="user", parts=[types.Part.from_text(text=content)])
                )
            elif role == "assistant" and content:
                contents.append(
                    types.Content(role="model", parts=[types.Part.from_text(text=content)])
                )

        # First LLM call
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                tools=[order_tool],
                system_instruction=SYSTEM_PROMPT,
                temperature=0.3,
                max_output_tokens=200,
            )
        )

        # Check if Gemini wants to call a function
        candidate = response.candidates[0]
        has_function_call = False
        
        for part in candidate.content.parts:
            if part.function_call:
                has_function_call = True
                func_name = part.function_call.name
                func_args = dict(part.function_call.args) if part.function_call.args else {}
                
                # Execute the function
                func = available_functions.get(func_name)
                if func:
                    result = func(**func_args)
                else:
                    result = {"error": f"Unknown function: {func_name}"}
                
                # Append the model's function call and the result
                contents.append(candidate.content)
                contents.append(
                    types.Content(
                        role="user",
                        parts=[types.Part.from_function_response(
                            name=func_name,
                            response=result
                        )]
                    )
                )
                
                # Second LLM call with tool result
                response2 = await client.aio.models.generate_content(
                    model=MODEL,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.3,
                        max_output_tokens=200,
                    )
                )
                return response2.text or ""
        
        if not has_function_call:
            return response.text or ""
            
    except Exception as e:
        print(f"Error in process_chat: {e}")
        import traceback
        traceback.print_exc()
        return "I'm sorry, I'm having a little trouble connecting right now. Could you repeat that?"


async def generate_summary(messages: list) -> dict:
    """Generate a structured JSON summary after the call ends."""
    
    transcript = []
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            label = "Customer" if role == "user" else "Aria"
            transcript.append(f"{label}: {content}")
            
    transcript_text = "\n".join(transcript)
    
    summary_prompt = f"""Analyze the following customer support conversation transcript and extract a structured JSON summary.

Conversation Transcript:
{transcript_text}

Respond ONLY with a valid JSON object (no markdown, no code fences) matching this exact structure:
{{
  "customer_intent": "<one of: ORDER_TRACKING, CANCELLATION, RETURN, REFUND, SHIPPING, COD, GENERAL_QUERY, OUT_OF_SCOPE, UNKNOWN>",
  "order_id": "<extracted order ID or null>",
  "resolution_status": "<one of: RESOLVED, UNRESOLVED, OUT_OF_SCOPE, NEEDS_INFORMATION>",
  "call_summary": "<brief 1-2 sentence summary>"
}}"""
    
    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=summary_prompt)])],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0,
                max_output_tokens=200,
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating summary: {e}")
        return {
            "customer_intent": "UNKNOWN",
            "order_id": None,
            "resolution_status": "UNRESOLVED",
            "call_summary": "Failed to generate summary."
        }
