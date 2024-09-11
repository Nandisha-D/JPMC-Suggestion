import { useState, useEffect, useRef } from "react";
import { IoIosChatbubbles } from "react-icons/io";
import { v4 as uuidv4 } from "uuid";
import { conversation } from "../ConversationInfo/emily"; // Ensure this file exports an array of conversation objects
import { TbReportSearch } from "react-icons/tb";
import CONFIG from "../UtilsComps/config";
import axios from "axios";

function ChatComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [sentMessages, setSentMessages] = useState([
    { id: uuidv4(), text: "Hello, how are you?", sender: "user" },
    { id: uuidv4(), text: "I'm doing great, thanks!", sender: "bot" },
    { id: uuidv4(), text: "What about you?", sender: "user" },
  ]);
  const [receivedSuggestions, setReceivedSuggestions] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // socketRef.current = new WebSocket(CONFIG.WEBSOCKET_URL);
    // let currentIndex = 0;
    // const sendDataIncrementally = () => {
    //   if (currentIndex < conversation.length) {
    //     const messageWithId = {
    //       ...conversation[currentIndex],
    //       id: uuidv4(),
    //     };
    //     console.log("Sending message:", messageWithId);
    //     socketRef.current.send(JSON.stringify(messageWithId));
    //     setSentMessages((prevMessages) => [...prevMessages, messageWithId]);
    //     currentIndex += 1;
    //   } else {
    //     clearInterval(intervalId);
    //   }
    // };
    // const intervalId = setInterval(sendDataIncrementally, 2000);
    // socketRef.current.onopen = () => {
    //   console.log("WebSocket connection established");
    // };
    // socketRef.current.onclose = () => {
    //   console.log("WebSocket connection closed");
    //   clearInterval(intervalId);
    // };
    // socketRef.current.onmessage = (event) => {
    //   try {
    //     const data = JSON.parse(event.data);
    //     console.log("Received data:", data);
    //     // Check if heading and body are not blank before adding to receivedSuggestions
    //     if (data.id && data.suggestion_heading.trim() !== "") {
    //       setReceivedSuggestions((prevSuggestions) => [
    //         ...prevSuggestions,
    //         {
    //           id: data.id,
    //           heading: data.suggestion_heading,
    //           body: data.suggestion_body,
    //         },
    //       ]);
    //     }
    //   } catch (error) {
    //     console.error("Error parsing WebSocket message:", error);
    //   }
    // };
    // return () => {
    //   socketRef.current?.close();
    //   clearInterval(intervalId);
    // };
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const GenerateReport = async () => {
    try {
      // Define the endpoint
      const endpoint = CONFIG.HTTP_URL;

      // Make the HTTP POST request
      const response = await axios.post(endpoint, { conversation });

      // Log the response from the server
      console.log("Server Response:", response.data);
    } catch (error) {
      // Handle errors if the request fails
      console.error("Error sending report:", error);
    }
  };

  const speakMessage = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      console.error("Speech Synthesis not supported in this browser.");
    }
  };

  const combinedChatHistory = sentMessages.map((message) => {
    const suggestion = receivedSuggestions.find(
      (suggestion) => suggestion.id === message.id
    );

    return suggestion ? { ...message, suggestion } : message;
  });

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <button
        onClick={toggleSidebar}
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 50,
          borderRadius: "50%",
          padding: "16px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
        }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <IoIosChatbubbles />
      </button>

      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100%",
          width: "320px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #ddd",
              padding: "16px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold" }}>Chat</h2>
          </div>

          <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
            {combinedChatHistory.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent:
                    message.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    borderRadius: "8px",
                    padding: "8px",
                    backgroundColor:
                      message.sender === "user" ? "#007bff" : "#f1f1f1",
                    color: message.sender === "user" ? "#fff" : "#000",
                    position: "relative",
                  }}
                >
                  <p>{message.text}</p>
                  {message.suggestion && (
                    <button
                      onClick={() =>
                        speakMessage(
                          message.suggestion.heading +
                            " " +
                            message.suggestion.body
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        position: "absolute",
                        right: "8px",
                        top: "8px",
                      }}
                      aria-label="Read message aloud"
                    >
                      🔊
                    </button>
                  )}
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
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #ddd", padding: "16px" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("message");
                if (input && input.value.trim()) {
                  setSentMessages([
                    ...sentMessages,
                    { id: Date.now(), text: input.value, sender: "user" },
                  ]);
                  input.value = "";
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "space-evenly",
                }}
              >
                {/* <input
                  type="text"
                  name="message"
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    padding: "8px",
                    fontSize: "14px",
                  }}
                /> */}

                <button
                  type="submit"
                  style={{
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  Talk
                </button>
                <button
                  onClick={GenerateReport}
                  type="submit"
                  style={{
                    backgroundColor: "white",
                    // color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    // padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  <TbReportSearch size={24} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatComponent;
