export async function getMe() {
    const res = await fetch(`${"http://localhost:8080"}/me`, {
      method: "GET",
      credentials: "include",
    });
  
    if (!res.ok) {
      throw new Error("Failed to fetch user");
    }
  
    return await res.json(); // returns { id, email, role, profile } based on your app.py
  }