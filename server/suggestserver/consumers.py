import json
import os
import requests
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

# Configure logging
logger = logging.getLogger(__name__)

class GPT4Model:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.url = "https://api.openai.com/v1/chat/completions"
        self.model = "gpt-4o-mini"

    def generate_response(self, messages):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 100  # Adjusted to allow for suggestion + explanation
        }
        try:
            logger.info(f"Sending request to OpenAI API: {json.dumps(data)[:500]}...")
            response = requests.post(self.url, headers=headers, json=data)
            logger.info(f"OpenAI API response status: {response.status_code}")
            
            if response.status_code == 200:
                logger.info(f"OpenAI API response: {response.text[:500]}...")
                return response.json()
            else:
                logger.error(f"Failed to call OpenAI API: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.exception(f"Error in OpenAI API call: {str(e)}")
            return None

class TestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = "suggestions"
        self.room_group_name = "suggestions"

        # Add the WebSocket to the group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Send a message when connected
        await self.send(text_data=json.dumps({"status": "connected"}))

        # Initialize GPT-4 model instance
        self.gpt4_model = GPT4Model()

        # Initialize conversation context
        self.conversation_context = []

        # Initialize set to store previous suggestions
        self.previous_suggestions = set()

    async def receive(self, text_data):
        # Process received data
        try:
            data = json.loads(text_data)

            # Add new message to the conversation context
            new_message = {
                "role": self.map_role('Senior Financial Advisor'),
                "content": f"{data['timestamp']} {data['speaker']}: {data['content']}"
            }
            self.conversation_context.append(new_message)

            # Check if the conversation warrants a suggestion (short response)
            should_suggest = await self.analyze_conversation_context()
            if should_suggest:
                # Get suggestions from OpenAI
                suggestions = await self.get_openai_suggestions(data['id'])
                print(f"Suggestions: {suggestions}")
                # Send suggestions back to the WebSocket with the unique ID
                await self.send(text_data=json.dumps(suggestions))
            else:
                await self.send(text_data=json.dumps({"id": data['id'], "suggestion_heading": "", "suggestion_body": ""}))

        except json.JSONDecodeError:
            print("Received invalid JSON")

    async def disconnect(self, close_code):
        # Remove from the group when WebSocket disconnects
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    def map_role(self, speaker):
        # Map speaker to OpenAI API roles
        if speaker == 'Financial Advisor':
            return 'assistant'
        else:
            return 'user'

    async def get_openai_suggestions(self, message_id):
        # Set predefined prompts for GPT-4 to generate short, impactful suggestions
        predefined_prompts = [
            {
                "role": "system",
                "content": ("You are an expert senior wealth manager advising a junior wealth manager during client meetings. "
                            "Your task is to provide concise and actionable financial suggestions as heading and body. "
                            "Heading must be 3-10 words and body must be at least 50 words and at most 60 words based on the conversation. "
                            "Each suggestion must be context-sensitive, meaning that the suggestion heading should include keywords mentioned in the conversation. "
                            "For example, if '529 plan' is mentioned, the suggestion heading must reflect '529 plan'. Focus on financial advice related to topics like tax benefits, long-term strategies, interest rates, and financial planning. "
                            "Avoid any conversational or formal gestures such as greetings or farewells. Each suggestion must also include a short 50-word explanation (body) clarifying the context and its significance. "
                            "If no useful content is available, respond with a blank space ' '. Do not repeat previous suggestions: " + ", ".join(self.previous_suggestions) + ". "
                            "If the context carries some more context, restructure the suggestion accordingly. For example: '529 College Savings Plan, you can contribute up to $17,000 per year per child without triggering federal gift tax.' can be framed as 'Explain more about federal taxes'.")
            },
            {
                "role": "user",
                "content": "This is a conversation between a financial advisor and their client. Based on the dialogue, generate concise financial suggestions. Heading should include keywords mentioned in the conversation, ensuring that the suggestion heading includes any key terms or topics mentioned (e.g., '529 plan'). Provide a heading that reflects the main topic discussed, followed by a 50-word explanation."
            }
        ]

        # Append conversation context to prompts
        self.conversation_context = predefined_prompts + self.conversation_context

        # Get suggestions from GPT-4
        response = self.gpt4_model.generate_response(self.conversation_context)
        if response:
            print(f"Full OpenAI response: {json.dumps(response, indent=2)}")  # Log the entire response
            choices = response.get('choices', [])
            if choices:
                suggestion_text = choices[0].get('message', {}).get('content', 'No suggestions available.')

                # Split the suggestion into heading and explanation
                suggestion_parts = suggestion_text.strip().split('\n')
                suggestion_heading = suggestion_parts[0].strip() if suggestion_parts else ""
                suggestion_body = suggestion_parts[1].strip() if len(suggestion_parts) > 1 else ""

                # Check if both heading and body have content
                if suggestion_heading and suggestion_body :
                    # Check if the suggestion is new
                    if suggestion_heading not in self.previous_suggestions:
                        # Add the new suggestion to the set
                        self.previous_suggestions.add(suggestion_heading)

                        # Prepare the response with a heading and explanation
                        suggestions = {
                            "id": message_id,  # Include the unique ID
                            "suggestion_heading": suggestion_heading,  # Short heading
                            "suggestion_body": suggestion_body          # Small explanation
                        }
                        print(f"Suggestion Heading: {suggestion_heading}")
                        print(f"Suggestion Body: {suggestion_body}")

                        return suggestions
                    else:
                        return {"id": message_id, "suggestion_heading": "No new suggestions", "suggestion_body": "All suggestions have been previously provided."}
                else:
                    return {"id": message_id, "suggestion_heading": "No content", "suggestion_body": "Generated suggestion is missing content."}

        return {"id": message_id, "suggestion_heading": "Error", "suggestion_body": "Error getting suggestions."}
    
    async def analyze_conversation_context(self):
        """
        Analyze the conversation context and decide if a suggestion is needed.
        You can add custom logic here to identify impactful moments.
        For now, we'll check for keywords indicating the conversation is starting or ending.
        """
        ending_keywords = [
            "bye", "goodbye", "see you", "take care", "farewell", 
            "talk to you later", "catch you later", "until next time", 
            "have a good day", "have a nice day", "see you soon", 
            "see you later", "good night", "good evening", "good afternoon","Thanks","great day"
        ]
        
        starting_keywords = [
            "hi", "hello", "good morning", "good afternoon", "good evening", 
            "hey", "greetings", "howdy", "what's up", "how are you"
        ]
        
        # Check if any ending or starting keyword is in the last message
        last_message = self.conversation_context[-1]['content'].lower()
        if any(keyword in last_message for keyword in ending_keywords + starting_keywords):
            return False
        
        return True
    # Set predefined prompts for GPT-4 to generate short, impactful suggestions
    # predefined_prompts = [
    #     {
    #         "role": "system",
    #         "content": ("You are an expert senior wealth manager advising a junior wealth manager during client meetings. "
    #                     "Your task is to provide concise and actionable financial suggestions as heading and body. "
    #                     "Heading must be 3-10 words and body must be at least 50 words and at most 60 words based on the conversation. "
    #                     "Each suggestion must be context-sensitive, meaning that the suggestion heading should include keywords mentioned in the conversation. "
    #                     "For example, if '529 plan' is mentioned, the suggestion heading must reflect '529 plan'. Focus on financial advice related to topics like tax benefits, long-term strategies, interest rates, and financial planning. "
    #                     "Avoid any conversational or formal gestures such as greetings or farewells. Each suggestion must also include a short 50-word explanation (body) clarifying the context and its significance. "
    #                     "If no useful content is available, respond with a blank space ' '. Do not repeat previous suggestions: " + ", ".join(self.previous_suggestions) + ". "
    #                     "If the context carries some more context, restructure the suggestion accordingly. For example: '529 College Savings Plan, you can contribute up to $17,000 per year per child without triggering federal gift tax.' can be framed as 'Explain more about federal taxes'.")
    #     },
    #     {
    #         "role": "user",
    #         "content": "This is a conversation between a financial advisor and their client. Based on the dialogue, generate concise financial suggestions. Heading should include keywords mentioned in the conversation, ensuring that the suggestion heading includes any key terms or topics mentioned (e.g., '529 plan'). Provide a heading that reflects the main topic discussed, followed by a 50-word explanation."
    #     }
    # ]

    # # Append conversation context to prompts
    # self.conversation_context = predefined_prompts + self.conversation_context

    # # Get suggestions from GPT-4
    # response = self.gpt4_model.generate_response(self.conversation_context)
    # if response:
    #     print(f"Full OpenAI response: {json.dumps(response, indent=2)}")  # Log the entire response
    #     choices = response.get('choices', [])
    #     if choices:
    #         suggestion_text = choices[0].get('message', {}).get('content', 'No suggestions available.')

    #         # Split the suggestion into heading and explanation
    #         suggestion_parts = suggestion_text.strip().split('\n')
    #         suggestion_heading = suggestion_parts[0].strip() if suggestion_parts else ""
    #         suggestion_body = suggestion_parts[1].strip() if len(suggestion_parts) > 1 else ""

    #         # Check if both heading and body have content
    #         if suggestion_heading and suggestion_body:
    #             # Check if the suggestion is new
    #             if suggestion_heading not in self.previous_suggestions:
    #                 # Add the new suggestion to the set
    #                 self.previous_suggestions.add(suggestion_heading)

    #                 # Prepare the response with a heading and explanation
    #                 suggestions = {
    #                     "id": message_id,  # Include the unique ID
    #                     "suggestion_heading": suggestion_heading,  # Short heading
    #                     "suggestion_body": suggestion_body          # Small explanation
    #                 }
    #                 print(f"Suggestion Heading: {suggestion_heading}")
    #                 print(f"Suggestion Body: {suggestion_body}")
                    
    #                 return suggestions
    #             else:
    #                 return {"id": message_id, "suggestion_heading": "No new suggestions", "suggestion_body": "All suggestions have been previously provided."}
    #         else:
    #             return {"id": message_id, "suggestion_heading": "No content", "suggestion_body": "Generated suggestion is missing content."}
        
    # return {"id": message_id, "suggestion_heading": "Error", "suggestion_body": "Error getting suggestions."}
