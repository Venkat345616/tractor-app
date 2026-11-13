const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export const getFarmers = () => request("/api/farmers");
export const addFarmer = (body) =>
  request("/api/farmers", { method: "POST", body: JSON.stringify(body) });

export const getJobs = (farmerId) => request(`/api/jobs?farmerId=${farmerId}`);
export const addJob = (body) =>
  request("/api/jobs", { method: "POST", body: JSON.stringify(body) });
export const updateJob = (id, body) =>
  request(`/api/jobs/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteJob = (id) => request(`/api/jobs/${id}`, { method: "DELETE" });