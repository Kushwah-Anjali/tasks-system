const path = require("path");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");

const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath, quiet: true });

const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const describeFailure = (error) => {
    const status = Number(error?.status || error?.statusCode || 0);
    const codes = [error?.code, error?.cause?.code, error?.cause?.cause?.code];
    const errorName = error?.constructor?.name || error?.name || error?.cause?.name;

    if (status === 401 || status === 403) {
        return "Groq authentication failed. Check GROQ_API_KEY and its permissions.";
    }
    if (status === 429) {
        return "Groq rate limit reached. Wait and try again.";
    }
    if (
        errorName === "APIConnectionError" ||
        error?.cause?.name === "TypeError" ||
        codes.some((code) => ["EACCES", "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN"].includes(code))
    ) {
        return "Could not connect to Groq. Check the network connection and try again.";
    }
    if (status > 0) {
        return `Groq request failed with HTTP ${status}. Check GROQ_MODEL and the request configuration.`;
    }
    return "Groq request failed. Check the SDK installation and backend configuration.";
};

const main = async () => {
    if (!apiKey) {
        console.error(`Missing GROQ_API_KEY. Set it in ${envPath} or the process environment.`);
        process.exitCode = 1;
        return;
    }

    try {
        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
            model,
            messages: [
                {
                    role: "user",
                    content: "Reply exactly: Groq connection successful",
                },
            ],
            max_completion_tokens: 128,
            reasoning_effort: "low",
            temperature: 0,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (typeof responseText !== "string" || responseText.length === 0) {
            console.error("Groq returned no text. Check the model settings and completion token limit.");
            process.exitCode = 1;
            return;
        }

        console.log(`Model: ${model}`);
        console.log(`Response: ${responseText}`);
    } catch (error) {
        console.error(describeFailure(error));
        process.exitCode = 1;
    }
};

void main();
