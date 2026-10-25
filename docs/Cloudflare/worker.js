// Helper to safely encode large files to Base64 without call-stack overflows
function encodeBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export default {
    async fetch(request, env, ctx) {
        // 1. Handle CORS Preflight OPTIONS Request
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        };

        if (request.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: corsHeaders,
            });
        }

        // Cronitor Telemetry Helper using ctx.waitUntil (non-blocking)
        const sendHeartbeat = (state) => {
            if (env.CRONITOR_AUTH_KEY) {
                const url = `https://cronitor.link/p/${env.CRONITOR_AUTH_KEY}/r5Q0I4?state=${state}`;
                ctx.waitUntil(fetch(url).catch(err => console.error("Cronitor ping failed:", err)));
            }
        };

        try {
            const body = await request.json();
            const token = body.token;

            if (!token) {
                sendHeartbeat('fail');
                return new Response(JSON.stringify({ success: false, error: "Missing token" }), { status: 400, headers: corsHeaders });
            }

            // 2. Verify Cloudflare Turnstile Token
            const formData = new FormData();
            formData.append("secret", env.TURNSTILE_SECRET_KEY);
            formData.append("response", token);

            const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                method: "POST",
                body: formData,
            });

            const outcome = await verifyRes.json();

            if (outcome.success) {
                let resumeBase64 = null;

                // 3. Fetch PDF from R2 securely
                /*if (env.RESUME_BUCKET) {
                  const pdfObject = await env.RESUME_BUCKET.get('resume.pdf');
                  if (pdfObject) {
                    const pdfBuffer = await pdfObject.arrayBuffer();
                    resumeBase64 = encodeBase64(pdfBuffer);
                  } else {
                    console.warn("resume.pdf not found in R2 bucket.");
                  }
                }*/

                // Send successful heartbeat to Cronitor
                sendHeartbeat('complete');

                // 4. Return secure data to frontend
                return new Response(
                    JSON.stringify({
                        success: true,
                        email: env.CONTACT_EMAIL,
                        phone: env.CONTACT_PHONE,
                        resumeBase64: resumeBase64
                    }),
                    { status: 200, headers: corsHeaders }
                );
            } else {
                // Send failure heartbeat to Cronitor
                sendHeartbeat('fail');
                return new Response(
                    JSON.stringify({ success: false, error: "Turnstile verification failed" }),
                    { status: 400, headers: corsHeaders }
                );
            }
        } catch (err) {
            // Send failure heartbeat to Cronitor
            sendHeartbeat('fail');
            return new Response(
                JSON.stringify({ success: false, error: err.message }),
                { status: 500, headers: corsHeaders }
            );
        }
    },
};