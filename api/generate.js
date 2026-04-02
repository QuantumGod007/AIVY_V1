export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { model = 'gemini-1.5-flash', contents, generationConfig } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
        
        // Securely pass the contents (which may contain text and/or inlineData)
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ contents, generationConfig })
        });

        const data = await response.json();
        
        if (data.error) {
            return res.status(response.status || 400).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Vercel Logic Error:', error);
        res.status(500).json({ error: 'Server communication failed.' });
    }
}
