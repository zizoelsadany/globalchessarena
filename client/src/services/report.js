import { api } from "./api.js";

export async function submitReport(payload) {
  return api("/reports", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
