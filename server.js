const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai');

const path = require('path');

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs/promises");

// Skapa en temporär katalog för att spara bilder
const TEMP_DIR = path.join(__dirname, "images");
(async () => {
    try {
        await fs.mkdir(TEMP_DIR, { recursive: true });
    } catch (err) {
        console.error("Failed to create images directory:", err);
    }
})();

// Funktion för att ladda ner bilden och spara den lokalt
const downloadImage = async (stream, filename) => {
    const filePath = path.join(TEMP_DIR, filename);
    await fs.writeFile(filePath, stream);
    return filePath;
};


const app = express();
app.use(cors());
const apiKey = process.env.AI_API_KEY ;

const openai = new OpenAI({
    apiKey: apiKey,
  });

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});


app.get('/getGameContextOld', async (req, res) => {
    const environment = req.query.environment; // Ta emot miljön som en query parameter

    try {
        const prompt = `Skapa data för ett spel. Givet en miljö "${environment}", beskriv följande:
        
        1. Enemy: En karaktär som är en fiende i denna miljö. Beskriv kortfattat. Endast några ord. Vad det är och egenskaper. Exempel: "Tiger, farlig och listig"
        2. Hero: En karaktär som är en hjälte i denna miljö. Beskriv kortfattat. Endast några ord. Vad det är och egenskaper. Exempel: "Papegoja, smart och pratglad"
        3. Victim: En karaktär som är ett offer i denna miljö. Beskriv kortfattat. Endast några ord. Vad det är och egenskaper Exempel: "Hare, snabb men försiktig".
        4. IntroText: Text som ska visas innan spelet börjar. Den ska på ett engagerande sätt introducera spelet utifrån karaktärerna och miljön. Beskriv hur spelaren
        ikläder sig rollen som hjälten för att beskydda offren från fienden. Få även in att man använder piltangenter för att styra.
        Svara i ett jsonformat enligt följande:
        {
            \"environment\": \"Rymden\",
            \"introText\": \"Som rymdforksare är det ditt ansvar att skydda de stackars ensamma och rädda austronauterna mot den sluga och skoningslösa rymdpiraden. Använd piltangenterna och låt spelet börja...\",
            \"Enemy\": \"Rymdpirat, slug och skoningslös\",
            \"Hero\": \"Rymdutforskare, modig och skicklig\",
            \"Victim\": \"Astronaut, ensam och rädd\"
        }`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            max_tokens: 200,
            messages: [
                { role: "system", content: "Detta är en konversation mellan en användare och en AI." },
                { role: "user", content: prompt }
            ]
        });

        const textResponse = response.choices[0].message.content.trim();
        parsedResponse = extractAndParseJson(textResponse);
        //const parsedResponse = {introText:"Livliga träd och vild vilda djur.",Enemy:"Orm, giftig och snabb.",Hero:"Gorilla, stark och beskyddande.",Victim:"Fågel, sårbar och vacker."}

        res.send(parsedResponse);
    } catch (error) {
        console.error('Fel vid anrop till OpenAI:', error);
        res.status(500).send('Ett fel inträffade vid anrop till OpenAI');
    }
});

app.get('/getGameContext', async (req, res) => {
    const environment = req.query.environment; // Ta emot miljön som en query parameter

    try {
        const prompt = `Create data for a game. Given an environment "${environment}", describe the following:

            1. Enemy: A character that is an enemy in this environment. Describe briefly in just a few words. What it is and its traits. Example: "Tiger, dangerous and cunning"
            2. Hero: A character that is a hero in this environment. Describe briefly in just a few words. What it is and its traits. Example: "Parrot, smart and talkative"
            3. Victim: A character that is a victim in this environment. Describe briefly in just a few words. What it is and its traits. Example: "Hare, fast but cautious"
            4. IntroText: A text that is displayed before the game starts. It should introduce the game engagingly based on the characters and environment. Describe how the player takes on the role of the hero to protect the victims from the enemy. Also, mention that arrow keys are used to control the game.

            Respond in JSON format as follows:
            {
                \"environment\": \"Space\",
                \"introText\": \"As a space explorer, it is your duty to protect the poor, lonely, and frightened astronauts from the cunning and ruthless space pirate. Use the arrow keys and let the game begin...\",
                \"Enemy\": \"Space pirate, cunning and ruthless\",
                \"Hero\": \"Space explorer, brave and skilled\",
                \"Victim\": \"Astronaut, lonely and scared\"
            }`;


        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 200,
            messages: [
                { role: "system", content: "You are a creator of text content for a video game." },
                { role: "user", content: prompt }
            ]
        });

        const textResponse = response.choices[0].message.content.trim();
        parsedResponse = extractAndParseJson(textResponse);
        //const parsedResponse = {introText:"Livliga träd och vild vilda djur.",Enemy:"Orm, giftig och snabb.",Hero:"Gorilla, stark och beskyddande.",Victim:"Fågel, sårbar och vacker."}

        res.send(parsedResponse);
    } catch (error) {
        console.error('Fel vid anrop till OpenAI:', error);
        res.status(500).send('Ett fel inträffade vid anrop till OpenAI');
    }
});

app.get('/getBackgroundOld', async (req, res) => {
    const environment = req.query.environment; // Ta emot miljön som en query parameter
    if (!environment) {
        return res.status(400).send('Environment parameter is required');
    }

    try {

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Skapa en färgglad miljöbild i pixelart-stil till ett spel. Miljön ska vara: ${environment}. I främre delen av bilden ska finnas yta att stå på. Bakgre delen ska innehålla detaljer utifrån miljön. Fyll ut hela bilden.`,
            n: 1,
            size: "1792x1024"
          });

                // Hämta bilden baserat på URL:en från OpenAI's svar (anpassa detta efter faktiskt svar)
                const imageUrl = response.data[0].url; // Antagande: svaret innehåller en bild-URL
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        
                // Sätt rätt innehållstyp för bilden
                res.setHeader('Content-Type', 'image/png'); // Antagande: bilden är i PNG-format
        
                // Skicka bildens innehåll som respons
                res.send(imageResponse.data);
    } catch (error) {
        console.error('Failed to generate image:', error);
        res.status(500).send('Failed to generate image');
    }
});

// GET-endpoint för att generera och returnera en bildfil
app.get("/getBackground", async (req, res) => {
    try {
        
        const environment = req.query.environment; // Ta emot miljön som en query parameter
        if (!environment) {
            return res.status(400).send('Environment parameter is required');
        }
        const prompt = `Create a colorful pixel art style environment picture for a game. The environment should be: ${environment}. The front part of the image should have a surface to stand on. The back part should contain details from the environment.`;
        const aspect_ratio = "16:9";
        const safety_filter_level = "block_medium_and_above";

        console.log("Generating image...");

        // 🔹 Steg 1: Starta bildgenerering och få bildens URL
        const output = await replicate.run("google/imagen-3-fast", {
            input: {
                prompt,
                aspect_ratio,
                safety_filter_level,
            },
        });

        if (!output || output.length === 0) {
            throw new Error("No image generated.");
        }

        // 🔹 Steg 2: Ladda ner och spara bilden
        const filename = `image_${Date.now()}.png`;
        const filePath = await downloadImage(output, filename);

        // 🔹 Steg 3: Skicka bilden som respons
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error("Error sending file:", err);
                res.status(500).json({ error: "Failed to send image" });
            } else {
                // Ta bort bilden efter att den skickats för att spara utrymme
                fs.unlink(filePath).catch((unlinkErr) => {
                    console.error("Failed to delete image:", unlinkErr);
                });
            }
        });

    } catch (error) {
        console.error("Error generating pixelart in getBackground:", error.message);
        res.status(500).json({ error: "Failed to generate pixelart" });
    }
});

app.get('/getSpriteold', async (req, res) => {
    const description = req.query.description; // Ta emot beskrivningen som en query parameter
    if (!description) {
        return res.status(400).send('description parameter is required');
    }

    try {

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Skapa en färgglad sprite till ett spel i pixelart-stil. Det ska vara:  ${description} .Det ska bara vara en tydlig karaktär i helfigur. Inga övriga objekt. Bakgrunden ska vara enfärgad`,
            n: 1,
            size: "1024x1024"
          });

        // Hämta bilden baserat på URL:en från OpenAI's svar
        const imageUrl = response.data[0].url; // Antagande: svaret innehåller en bild-URL
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        //Ta bort backgrund
        const bgRemovalResponse = await axios.post(`https://removebackgroundnow.azurewebsites.net/removeBG`, imageResponse.data,{
            headers: {
                'Content-Type': 'image/png'
            },
            responseType: 'arraybuffer'
        });

        // Sätt rätt innehållstyp för bilden
        res.setHeader('Content-Type', 'image/png'); // Antagande: bilden är i PNG-format

        // Skicka bildens innehåll som respons
        res.send(bgRemovalResponse.data)
        //res.send(imageResponse.data);
    } catch (error) {
        console.error('Failed to generate image:', error);
        if (error.message) console.error('Error message:', error.message);
        if (error.stack) console.error('Error stack trace:', error.stack);
        res.status(500).send('Failed to generate image');
    }
});

// GET-endpoint för att generera och returnera en bildfil
app.get("/getSprite", async (req, res) => {
    try {
        const description = req.query.description;
        if (!description) {
            return res.status(400).send("Description parameter is required");
        }

        const prompt = `${description} in raw 90's pixel art style. Full figure. The background should be solid color.`;
        console.log("Generating image...");

        // 🔹 Steg 1: Generera bild och få URL
        const output = await replicate.run("google/imagen-3-fast", {
            input: {
                aspect_ratio: "1:1",
                negative_prompt: "no objects other than the character. Nothing in the background. No environment",
                prompt: prompt,
                safety_filter_level: "block_only_high",
            },
        });

        console.log("Replicate Output:", output);

        if (!output || output.length === 0) {
            throw new Error("No image generated.");
        }

        // 🔹 Steg 2: Ladda ner och spara bilden
        const filename = `image_${Date.now()}.png`;
        const filePath = await downloadImage(output, filename); // Ladda ner från URL

        console.log("File saved at:", filePath);

        // 🔹 Steg 3: Läs in den sparade bilden som en buffer
        const imageBuffer = await fs.readFile(filePath);

        console.log("Image buffer read, sending to background removal service...");

        // 🔹 Steg 4: Skicka bilden till bakgrundsborttagnings-API:t
        const bgRemovalResponse = await axios.post(
            "https://removebackgroundnow.azurewebsites.net/removeBG",
            imageBuffer,
            {
                headers: { "Content-Type": "image/png" },
                responseType: "arraybuffer",
            }
        );

        console.log("Background removed successfully!");

        // 🔹 Steg 5: Sätt rätt innehållstyp och returnera den redigerade bilden
        res.setHeader("Content-Type", "image/png");
        res.send(bgRemovalResponse.data);

        // 🔹 Steg 6: Ta bort den temporära originalbilden för att spara utrymme
        await fs.unlink(filePath).catch((err) => console.error("Failed to delete image:", err));
    } catch (error) {
        console.error("Error in getSprite:", error.message);
        res.status(500).json({ error: "Failed to generate and process sprite" });
    }
});

function extractAndParseJson(inputString) {
    // Använd ett reguljärt uttryck för att matcha JSON-strukturen
    // Detta enkla exempel antar att JSON-strukturen startar med '{' och slutar med '}'
    // och inte innehåller några klammerparenteser '{' eller '}' i nycklar eller värden utanför andra objekt.
    const jsonPattern = /\{.*\}/s;
    const match = inputString.match(jsonPattern);

    if (match) {
        const jsonString = match[0];
        try {
            const jsonData = JSON.parse(jsonString);
            return jsonData;
        } catch (error) {
            console.error("Parsing error:", error);
            return null;
        }
    } else {
        console.error("Ingen JSON-struktur hittades");
        return null;
    }
}


const port = process.env.PORT || 3000; // Använd miljövariabeln PORT, eller 3000 om PORT inte är definierad
app.listen(port, () => console.log(`Server körs på port ${port}`));
