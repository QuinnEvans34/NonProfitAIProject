const BASE = '';

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export const api = {
  // Intakes
  startIntake:        ()       => request('POST',  '/api/intakes/start'),
  sendMessage:        (id, c)  => request('POST',  `/api/intakes/${id}/message`, { content: c }),
  getIntake:          (id)     => request('GET',   `/api/intakes/${id}`),
  listIntakes:        ()       => request('GET',   '/api/intakes'),
  patchIntake:        (id, p)  => request('PATCH', `/api/intakes/${id}`, p),
  reanalyzeIntake:    (id)     => request('POST',  `/api/intakes/${id}/reanalyze`),

  // Admin (placeholders — endpoints come in prompt 07)
  listKeywords:       ()       => request('GET',   '/api/admin/keywords'),
  addKeyword:         (kw)     => request('POST',  '/api/admin/keywords', kw),
  updateKeyword:      (id, kw) => request('PATCH', `/api/admin/keywords/${id}`, kw),
  deleteKeyword:      (id)     => request('DELETE', `/api/admin/keywords/${id}`),
  listOverrides:      ()       => request('GET',   '/api/admin/overrides'),
  listAIComments:     (q)      => request('GET',   `/api/admin/comments${q ? '?' + new URLSearchParams(q) : ''}`),
  rateComment:        (intakeId, idx, helpful) =>
                                   request('POST', `/api/admin/comments/${intakeId}/${idx}/feedback`, { helpful }),

  // Reports (placeholders — endpoints come in prompt 08)
  reportSummary:      (q)      => request('GET',   `/api/reports/summary${q ? '?' + new URLSearchParams(q) : ''}`),
  reportExportUrl:    (q)      => '/api/reports/export' + (q ? '?' + new URLSearchParams(q) : ''),
};
