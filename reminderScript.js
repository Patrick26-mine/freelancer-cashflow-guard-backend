// reminderScript.js
import axios from "axios";
import promptSync from "prompt-sync";

const prompt = promptSync({ sigint: true }); // Ctrl+C to exit
const BASE_URL = "http://localhost:5001/api/reminders";

// ------------------------
// HELPER FUNCTION TO LOG FULL ERRORS
// ------------------------
function logError(error) {
  if (error.response) {
    console.error("Error response from backend:");
    console.error("Status:", error.response.status);
    console.error("Data:", error.response.data);
    console.error("Headers:", error.response.headers);
  } else if (error.request) {
    console.error("No response received. Request details:", error.request);
  } else {
    console.error("Error setting up request:", error.message);
  }
}

// ------------------------
// CREATE REMINDER
// ------------------------
async function createReminder() {
  const invoice_id = prompt("Enter invoice_id: ");
  const reminder_date = prompt("Enter reminder_date (YYYY-MM-DD): ");
  const type = prompt("Enter type (Polite/Firm): ");
  const message_status = prompt("Enter message_status (Pending/Sent): ");

  const reminder = { invoice_id, reminder_date, type, message_status };

  try {
    const res = await axios.post(BASE_URL, reminder, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("Reminder created successfully:", res.data);
  } catch (error) {
    logError(error);
  }
}

// ------------------------
// READ REMINDER
// ------------------------
async function getReminder() {
  const id = prompt("Enter reminder ID to fetch: ");
  try {
    const res = await axios.get(`${BASE_URL}/${id}`);
    console.log("Reminder data:", res.data);
  } catch (error) {
    logError(error);
  }
}

// ------------------------
// UPDATE REMINDER
// ------------------------
async function updateReminder() {
  const id = prompt("Enter reminder ID to update: ");
  const type = prompt("Enter new type (leave blank to keep current): ");
  const message_status = prompt("Enter new message_status (leave blank to keep current): ");

  try {
    const existingRes = await axios.get(`${BASE_URL}/${id}`);
    const existing = existingRes.data;

    if (!existing) {
      console.log("Reminder not found.");
      return;
    }

    const payload = {
      ...existing,
      ...(type && { type }),
      ...(message_status && { message_status }),
    };

    const res = await axios.put(`${BASE_URL}/${id}`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("Reminder updated successfully:", res.data);
  } catch (error) {
    logError(error);
  }
}

// ------------------------
// DELETE REMINDER
// ------------------------
async function deleteReminder() {
  const id = prompt("Enter reminder ID to delete: ");
  try {
    const res = await axios.delete(`${BASE_URL}/${id}`);
    console.log("Reminder deleted successfully:", res.data);
  } catch (error) {
    logError(error);
  }
}

// ------------------------
// INTERACTIVE MENU
// ------------------------
async function mainMenu() {
  console.log("\n--- REMINDER TABLE INTERACTIVE ---");

  while (true) {
    console.log("\nChoose an action:");
    console.log("1. Create reminder");
    console.log("2. Read reminder");
    console.log("3. Update reminder");
    console.log("4. Delete reminder");
    console.log("5. Exit");

    const choice = prompt("Enter your choice (1-5): ");

    switch (choice) {
      case "1":
        await createReminder();
        break;
      case "2":
        await getReminder();
        break;
      case "3":
        await updateReminder();
        break;
      case "4":
        await deleteReminder();
        break;
      case "5":
        console.log("Exiting...");
        process.exit(0);
      default:
        console.log("Invalid choice. Enter 1-5.");
    }
  }
}

// Start interactive menu
mainMenu();
