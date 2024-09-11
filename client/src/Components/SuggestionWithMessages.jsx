import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { conversation } from "../ConversationInfo/emily"; // Ensure this file exports an array of conversation objects

function SuggestionWithMessage() {
  // State to store conversation history and suggestions
  const [sentMessages, setSentMessages] = useState([]); // Stores messages that have been sent
  const [receivedSuggestions, setReceivedSuggestions] = useState([]); // Stores suggestions received from the backend

  useEffect(() => {
    // Create a new WebSocket connection
    const socket = new WebSocket("ws://localhost:8000/ws/test/");

    let currentIndex = 0;

    const sendDataIncrementally = () => {
      if (currentIndex < conversation.length) {
        const messageWithId = {
          ...conversation[currentIndex],
          id: uuidv4(), // Generate a unique ID for each message
        };
        console.log("Sending message:", messageWithId); // Debugging the sent message
        socket.send(JSON.stringify(messageWithId));

        // Add the sent message to the sentMessages state
        setSentMessages((prevMessages) => [...prevMessages, messageWithId]);

        currentIndex += 1;
      } else {
        clearInterval(intervalId); // Stop sending when all data has been sent
      }
    };

    // Send conversation data every 2 seconds
    const intervalId = setInterval(sendDataIncrementally, 2000);

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      clearInterval(intervalId);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received data:", data); // Debugging received data

        // Add the received suggestion to the receivedSuggestions state
        if (data.id && data.suggestion_heading) {
          setReceivedSuggestions((prevSuggestions) => [
            ...prevSuggestions,
            {
              id: data.id,
              heading: data.suggestion_heading,
              body: data.suggestion_body || "", // Default empty body if not present
            },
          ]);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    return () => {
      socket.close();
      clearInterval(intervalId);
    };
  }, []);

  // Mapping sentMessages and receivedSuggestions together
  const combinedChatHistory = sentMessages.map((message) => {
    const suggestion = receivedSuggestions.find(
      (suggestion) => suggestion.id === message.id
    );

    return suggestion
      ? { ...message, suggestion } // Add suggestion to message if found
      : message;
  });

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "800px",
        height: "80vh",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>
        Financial Advisor Chat Interface
      </h1>
      <div
        style={{
          border: "1px solid #ddd",
          padding: "20px",
          borderRadius: "10px",
          height: "80vh",
          overflowY: "scroll",
          backgroundColor: "#f9f9f9",
        }}
      >
        {combinedChatHistory.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: "15px",
              padding: "10px",
              borderRadius: "5px",
              backgroundColor: "#fff",
              boxShadow: "0 0 5px rgba(0,0,0,0.1)",
            }}
          >
            {message.speaker && message.content ? (
              <>
                <p style={{ margin: "0", fontSize: "16px", color: "#34495e" }}>
                  <strong>{message.speaker}:</strong> {message.content}
                </p>
                {message.suggestion && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      borderRadius: "5px",
                      backgroundColor: "#eaf4f4",
                      border: "1px solid #b2ebeb",
                    }}
                  >
                    <p
                      style={{
                        margin: "0",
                        fontWeight: "bold",
                        fontSize: "14px",
                        color: "#00796b",
                      }}
                    >
                      {message.suggestion.heading}
                    </p>
                    <p
                      style={{
                        margin: "0",
                        fontSize: "14px",
                        color: "#00796b",
                      }}
                    >
                      {message.suggestion.body}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p>Message data is incomplete</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SuggestionWithMessage;
