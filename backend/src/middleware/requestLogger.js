// Simple request logger - logs method, URL, status code, and response time.
// In an interview you can say: "structured logging helps debug issues in
// production by giving visibility into what requests are doing."
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );
  });
  next();
}