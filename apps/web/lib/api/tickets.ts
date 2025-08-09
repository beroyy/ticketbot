// Simple, direct API functions for tickets
// No complex abstractions, just async functions that fetch data

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001';

export async function getTickets(guildId: string, filters?: {
  status?: string;
  page?: string;
  pageSize?: string;
}) {
  const params = new URLSearchParams(filters as any);
  params.append('guildId', guildId);
  
  const res = await fetch(`${API_URL}/tickets?${params}`);
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
}

export async function getTicket(ticketId: string) {
  const res = await fetch(`${API_URL}/tickets/${ticketId}`);
  if (!res.ok) throw new Error('Failed to fetch ticket');
  return res.json();
}

export async function getTicketMessages(ticketId: string) {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/messages`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function getTicketActivity(ticketId: string) {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/activity`);
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

export async function closeTicket(ticketId: string) {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/close`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to close ticket');
  return res.json();
}

export async function claimTicket(ticketId: string) {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/claim`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to claim ticket');
  return res.json();
}