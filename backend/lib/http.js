// Small helpers used by many files.

// Sends an error in the format the contract asks for.
export const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

// Express 4 does not catch errors in async routes by itself, so we wrap them.
export const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Turns a list or a value into plain text.
export const text = v => (Array.isArray(v) ? v.join(', ') : String(v ?? ''))
