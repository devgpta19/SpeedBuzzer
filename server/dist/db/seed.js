import knex from 'knex';
import { v4 as uuid } from 'uuid';
import { config } from '../config/index.js';
const ENGLISH_QUESTIONS = [
    // ── General Knowledge - Easy ──────────────────────────────
    { text: 'What is the capital of France?', answer: 'Paris', aliases: [], explanation: 'Paris has been the capital of France since the 10th century.', category: 'general_knowledge', difficulty: 'easy', language: 'en' },
    { text: 'How many continents are there on Earth?', answer: '7', aliases: ['seven'], explanation: 'The seven continents are Asia, Africa, North America, South America, Antarctica, Europe, and Australia/Oceania.', category: 'general_knowledge', difficulty: 'easy', language: 'en' },
    { text: 'What color are emeralds?', answer: 'Green', aliases: ['green'], explanation: 'Emeralds are a variety of the mineral beryl colored green by trace amounts of chromium.', category: 'general_knowledge', difficulty: 'easy', language: 'en' },
    { text: 'What is the largest ocean on Earth?', answer: 'Pacific Ocean', aliases: ['Pacific', 'the Pacific'], explanation: 'The Pacific Ocean covers approximately 63 million square miles.', category: 'general_knowledge', difficulty: 'easy', language: 'en' },
    { text: 'In which country is the Eiffel Tower located?', answer: 'France', aliases: [], explanation: 'The Eiffel Tower was built in Paris, France for the 1889 World\'s Fair.', category: 'general_knowledge', difficulty: 'easy', language: 'en' },
    { text: 'What gas do plants primarily absorb from the atmosphere?', answer: 'Carbon dioxide', aliases: ['CO2', 'carbon dioxide'], explanation: 'Plants use carbon dioxide for photosynthesis.', category: 'general_knowledge', difficulty: 'easy', language: 'en' },
    { text: 'How many legs does a spider have?', answer: '8', aliases: ['eight'], explanation: 'All arachnids, including spiders, have eight legs.', category: 'general_knowledge', difficulty: 'easy', language: 'en' },
    { text: 'What is the boiling point of water in Celsius?', answer: '100', aliases: ['100 degrees', '100°C', '100 degrees Celsius'], explanation: 'Water boils at 100°C at standard atmospheric pressure.', category: 'general_knowledge', difficulty: 'easy', language: 'en' },
    // ── Science - Easy ────────────────────────────────────────
    { text: 'What planet is known as the Red Planet?', answer: 'Mars', aliases: [], explanation: 'Mars appears red due to iron oxide (rust) on its surface.', category: 'science', difficulty: 'easy', language: 'en' },
    { text: 'What is H₂O commonly known as?', answer: 'Water', aliases: [], explanation: 'H₂O is the chemical formula for water — two hydrogen atoms and one oxygen atom.', category: 'science', difficulty: 'easy', language: 'en' },
    { text: 'Which organ pumps blood throughout the human body?', answer: 'Heart', aliases: ['the heart'], explanation: 'The heart pumps about 2,000 gallons of blood every day.', category: 'science', difficulty: 'easy', language: 'en' },
    { text: 'What force keeps us on the ground?', answer: 'Gravity', aliases: ['gravitational force'], explanation: 'Gravity is the force of attraction between objects with mass.', category: 'science', difficulty: 'easy', language: 'en' },
    // ── Science - Medium ──────────────────────────────────────
    { text: 'What is the chemical symbol for gold?', answer: 'Au', aliases: ['AU'], explanation: 'Au comes from the Latin word "aurum" meaning gold.', category: 'science', difficulty: 'medium', language: 'en' },
    { text: 'What is the powerhouse of the cell?', answer: 'Mitochondria', aliases: ['mitochondrion'], explanation: 'Mitochondria generate most of the cell\'s supply of ATP, the energy currency.', category: 'science', difficulty: 'medium', language: 'en' },
    { text: 'What is the speed of light in kilometers per second (approximately)?', answer: '300000', aliases: ['300,000', '3 × 10^8 m/s', '300000 km/s', '299792'], explanation: 'The speed of light is approximately 299,792 km/s.', category: 'science', difficulty: 'medium', language: 'en' },
    { text: 'What element has the atomic number 1?', answer: 'Hydrogen', aliases: ['H'], explanation: 'Hydrogen is the lightest and most abundant element in the universe.', category: 'science', difficulty: 'medium', language: 'en' },
    { text: 'How many bones are in the adult human body?', answer: '206', aliases: ['two hundred and six'], explanation: 'Adults have 206 bones; babies are born with about 270 that fuse over time.', category: 'science', difficulty: 'medium', language: 'en' },
    { text: 'What is the largest planet in our solar system?', answer: 'Jupiter', aliases: [], explanation: 'Jupiter\'s mass is 318 times that of Earth.', category: 'science', difficulty: 'medium', language: 'en' },
    // ── Science - Hard ────────────────────────────────────────
    { text: 'What is the Heisenberg Uncertainty Principle about?', answer: 'The impossibility of simultaneously knowing the exact position and momentum of a particle', aliases: ['position and momentum cannot be simultaneously measured precisely', 'uncertainty in position and momentum'], explanation: 'Formulated by Werner Heisenberg in 1927, this principle is fundamental to quantum mechanics.', category: 'science', difficulty: 'hard', language: 'en' },
    { text: 'What is the most abundant gas in Earth\'s atmosphere?', answer: 'Nitrogen', aliases: ['N2'], explanation: 'Nitrogen makes up about 78% of Earth\'s atmosphere.', category: 'science', difficulty: 'hard', language: 'en' },
    // ── History - Easy ────────────────────────────────────────
    { text: 'Who was the first President of the United States?', answer: 'George Washington', aliases: ['Washington'], explanation: 'George Washington served as president from 1789 to 1797.', category: 'history', difficulty: 'easy', language: 'en' },
    { text: 'In which year did World War II end?', answer: '1945', aliases: [], explanation: 'WWII ended in 1945 with the surrender of both Germany and Japan.', category: 'history', difficulty: 'easy', language: 'en' },
    // ── History - Medium ──────────────────────────────────────
    { text: 'Who discovered America in 1492?', answer: 'Christopher Columbus', aliases: ['Columbus'], explanation: 'Christopher Columbus reached the Americas in 1492, though Indigenous peoples had lived there for thousands of years.', category: 'history', difficulty: 'medium', language: 'en' },
    { text: 'What ancient civilization built the pyramids of Giza?', answer: 'Ancient Egyptians', aliases: ['Egypt', 'Egyptians', 'Ancient Egypt'], explanation: 'The Great Pyramid of Giza was built around 2560 BC for Pharaoh Khufu.', category: 'history', difficulty: 'medium', language: 'en' },
    { text: 'In which year did India gain independence from Britain?', answer: '1947', aliases: [], explanation: 'India became independent on August 15, 1947.', category: 'history', difficulty: 'medium', language: 'en' },
    { text: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', aliases: ['da Vinci', 'Leonardo'], explanation: 'Leonardo da Vinci painted the Mona Lisa between 1503 and 1519.', category: 'history', difficulty: 'medium', language: 'en' },
    // ── History - Hard ────────────────────────────────────────
    { text: 'What treaty ended World War I?', answer: 'Treaty of Versailles', aliases: ['Versailles Treaty'], explanation: 'The Treaty of Versailles was signed on June 28, 1919.', category: 'history', difficulty: 'hard', language: 'en' },
    { text: 'Who was the first Emperor of Rome?', answer: 'Augustus', aliases: ['Caesar Augustus', 'Octavian'], explanation: 'Augustus ruled from 27 BC to 14 AD as the first Roman Emperor.', category: 'history', difficulty: 'hard', language: 'en' },
    // ── Geography - Easy ──────────────────────────────────────
    { text: 'What is the longest river in the world?', answer: 'Nile', aliases: ['the Nile', 'Nile River', 'River Nile'], explanation: 'The Nile flows approximately 6,650 km through northeastern Africa.', category: 'geography', difficulty: 'easy', language: 'en' },
    { text: 'Which is the smallest country in the world?', answer: 'Vatican City', aliases: ['Vatican', 'the Vatican'], explanation: 'Vatican City covers about 44 hectares (110 acres).', category: 'geography', difficulty: 'easy', language: 'en' },
    // ── Geography - Medium ────────────────────────────────────
    { text: 'What is the capital of Japan?', answer: 'Tokyo', aliases: [], explanation: 'Tokyo has been the capital of Japan since 1868.', category: 'geography', difficulty: 'medium', language: 'en' },
    { text: 'Which desert is the largest hot desert in the world?', answer: 'Sahara', aliases: ['Sahara Desert', 'the Sahara'], explanation: 'The Sahara Desert spans about 9.2 million square kilometers across North Africa.', category: 'geography', difficulty: 'medium', language: 'en' },
    { text: 'What is the tallest mountain in the world?', answer: 'Mount Everest', aliases: ['Everest', 'Mt Everest', 'Mt. Everest'], explanation: 'Mount Everest stands at 8,849 meters above sea level.', category: 'geography', difficulty: 'medium', language: 'en' },
    // ── Geography - Hard ──────────────────────────────────────
    { text: 'What is the deepest point in Earth\'s oceans?', answer: 'Mariana Trench', aliases: ['Challenger Deep', 'Marianas Trench'], explanation: 'The Challenger Deep in the Mariana Trench reaches about 10,935 meters.', category: 'geography', difficulty: 'hard', language: 'en' },
    // ── Sports ────────────────────────────────────────────────
    { text: 'How many players are on a standard soccer team on the field?', answer: '11', aliases: ['eleven'], explanation: 'Each soccer team fields 11 players including the goalkeeper.', category: 'sports', difficulty: 'easy', language: 'en' },
    { text: 'In which sport is the term "love" used to mean zero?', answer: 'Tennis', aliases: [], explanation: '"Love" in tennis means a score of zero, possibly from the French "l\'oeuf" (egg, shaped like zero).', category: 'sports', difficulty: 'easy', language: 'en' },
    { text: 'Which country has won the most FIFA World Cups?', answer: 'Brazil', aliases: [], explanation: 'Brazil has won the FIFA World Cup five times (1958, 1962, 1970, 1994, 2002).', category: 'sports', difficulty: 'medium', language: 'en' },
    { text: 'In cricket, how many runs is a maximum hit over the boundary without bouncing?', answer: '6', aliases: ['six', 'a six'], explanation: 'A hit that clears the boundary without bouncing scores six runs.', category: 'sports', difficulty: 'easy', language: 'en' },
    // ── Entertainment ─────────────────────────────────────────
    { text: 'What is the name of the wizarding school in Harry Potter?', answer: 'Hogwarts', aliases: ['Hogwarts School of Witchcraft and Wizardry'], explanation: 'Hogwarts is the fictional school in J.K. Rowling\'s Harry Potter series.', category: 'entertainment', difficulty: 'easy', language: 'en' },
    { text: 'Who directed the movie "Titanic"?', answer: 'James Cameron', aliases: ['Cameron'], explanation: 'James Cameron directed and wrote Titanic, released in 1997.', category: 'entertainment', difficulty: 'medium', language: 'en' },
    { text: 'What animated movie features a clownfish named Nemo?', answer: 'Finding Nemo', aliases: [], explanation: 'Finding Nemo was released by Pixar Animation Studios in 2003.', category: 'entertainment', difficulty: 'easy', language: 'en' },
    // ── Literature ────────────────────────────────────────────
    { text: 'Who wrote "Romeo and Juliet"?', answer: 'William Shakespeare', aliases: ['Shakespeare'], explanation: 'Shakespeare wrote Romeo and Juliet around 1594–1596.', category: 'literature', difficulty: 'easy', language: 'en' },
    { text: 'What is the name of the hobbit in J.R.R. Tolkien\'s "The Hobbit"?', answer: 'Bilbo Baggins', aliases: ['Bilbo'], explanation: 'Bilbo Baggins is the protagonist of The Hobbit, published in 1937.', category: 'literature', difficulty: 'medium', language: 'en' },
    // ── Technology ────────────────────────────────────────────
    { text: 'What does "HTML" stand for?', answer: 'HyperText Markup Language', aliases: ['Hypertext Markup Language'], explanation: 'HTML is the standard markup language for documents designed to be displayed in a web browser.', category: 'technology', difficulty: 'easy', language: 'en' },
    { text: 'Who co-founded Apple Inc.?', answer: 'Steve Jobs', aliases: ['Steve Jobs and Steve Wozniak', 'Jobs'], explanation: 'Apple was co-founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976.', category: 'technology', difficulty: 'easy', language: 'en' },
    { text: 'What programming language is known for its coffee cup logo?', answer: 'Java', aliases: [], explanation: 'Java was developed by James Gosling at Sun Microsystems, released in 1995.', category: 'technology', difficulty: 'medium', language: 'en' },
    { text: 'What year was the first iPhone released?', answer: '2007', aliases: [], explanation: 'The first iPhone was released on June 29, 2007.', category: 'technology', difficulty: 'medium', language: 'en' },
    // ── Mathematics ───────────────────────────────────────────
    { text: 'What is the value of Pi to two decimal places?', answer: '3.14', aliases: ['3.14159'], explanation: 'Pi (π) is approximately 3.14159265...', category: 'mathematics', difficulty: 'easy', language: 'en' },
    { text: 'What is the square root of 144?', answer: '12', aliases: ['twelve'], explanation: '12 × 12 = 144.', category: 'mathematics', difficulty: 'easy', language: 'en' },
    { text: 'What is a triangle with all equal sides called?', answer: 'Equilateral triangle', aliases: ['equilateral'], explanation: 'An equilateral triangle has all three sides and angles equal (60° each).', category: 'mathematics', difficulty: 'medium', language: 'en' },
    // ── Current Affairs / Miscellaneous ───────────────────────
    { text: 'What is the currency of Japan?', answer: 'Yen', aliases: ['Japanese Yen', 'JPY'], explanation: 'The Japanese Yen (¥) has been the currency of Japan since 1871.', category: 'current_affairs', difficulty: 'easy', language: 'en' },
    { text: 'What is the currency of India?', answer: 'Indian Rupee', aliases: ['Rupee', 'INR', 'rupee'], explanation: 'The Indian Rupee (₹) is the official currency of India.', category: 'current_affairs', difficulty: 'easy', language: 'en' },
    // ── Music ─────────────────────────────────────────────────
    { text: 'How many keys does a standard piano have?', answer: '88', aliases: ['eighty-eight'], explanation: 'A standard modern piano has 88 keys — 52 white and 36 black.', category: 'music', difficulty: 'medium', language: 'en' },
    { text: 'Who is known as the "King of Pop"?', answer: 'Michael Jackson', aliases: ['Jackson', 'MJ'], explanation: 'Michael Jackson earned the title through his global impact on music and culture.', category: 'music', difficulty: 'easy', language: 'en' },
    // ── Nature ────────────────────────────────────────────────
    { text: 'What is the fastest land animal?', answer: 'Cheetah', aliases: [], explanation: 'Cheetahs can reach speeds of up to 112 km/h (70 mph) in short bursts.', category: 'nature', difficulty: 'easy', language: 'en' },
    { text: 'What is the largest mammal in the world?', answer: 'Blue whale', aliases: ['blue whale'], explanation: 'Blue whales can grow up to 30 meters long and weigh up to 173 tonnes.', category: 'nature', difficulty: 'easy', language: 'en' },
    // ── Mythology ─────────────────────────────────────────────
    { text: 'In Greek mythology, who is the king of the gods?', answer: 'Zeus', aliases: [], explanation: 'Zeus is the ruler of the Olympian gods in Greek mythology.', category: 'mythology', difficulty: 'easy', language: 'en' },
    { text: 'In Hindu mythology, who is known as the Destroyer?', answer: 'Shiva', aliases: ['Lord Shiva', 'Mahadev', 'Mahesh'], explanation: 'Lord Shiva is the destroyer and transformer in the Hindu Trimurti.', category: 'mythology', difficulty: 'easy', language: 'en' },
];
const HINDI_QUESTIONS = [
    { text: 'भारत की राजधानी क्या है?', answer: 'नई दिल्ली', aliases: ['दिल्ली', 'New Delhi', 'Delhi'], explanation: 'नई दिल्ली 1931 से भारत की राजधानी है।', category: 'general_knowledge', difficulty: 'easy', language: 'hi' },
    { text: 'भारत का राष्ट्रीय पशु कौन सा है?', answer: 'बाघ', aliases: ['बंगाल टाइगर', 'Tiger', 'Bengal Tiger'], explanation: 'बंगाल बाघ को 1973 में भारत का राष्ट्रीय पशु घोषित किया गया।', category: 'general_knowledge', difficulty: 'easy', language: 'hi' },
    { text: 'भारत का राष्ट्रीय फूल क्या है?', answer: 'कमल', aliases: ['Lotus'], explanation: 'कमल का फूल भारतीय संस्कृति में पवित्रता का प्रतीक है।', category: 'general_knowledge', difficulty: 'easy', language: 'hi' },
    { text: 'महात्मा गांधी का पूरा नाम क्या था?', answer: 'मोहनदास करमचंद गांधी', aliases: ['Mohandas Karamchand Gandhi'], explanation: 'महात्मा गांधी का जन्म 2 अक्टूबर 1869 को पोरबंदर में हुआ था।', category: 'history', difficulty: 'easy', language: 'hi' },
    { text: 'पृथ्वी सूर्य के चारों ओर एक चक्कर कितने दिनों में लगाती है?', answer: '365', aliases: ['365 दिन', '365 days'], explanation: 'पृथ्वी सूर्य की परिक्रमा लगभग 365.25 दिनों में करती है।', category: 'science', difficulty: 'easy', language: 'hi' },
    { text: 'भारत की सबसे लंबी नदी कौन सी है?', answer: 'गंगा', aliases: ['Ganga', 'Ganges'], explanation: 'गंगा नदी भारत में लगभग 2,525 किलोमीटर लंबी है।', category: 'geography', difficulty: 'easy', language: 'hi' },
    { text: 'विश्व का सबसे ऊँचा पर्वत शिखर कौन सा है?', answer: 'माउंट एवरेस्ट', aliases: ['एवरेस्ट', 'Mount Everest', 'Everest'], explanation: 'माउंट एवरेस्ट की ऊँचाई 8,849 मीटर है।', category: 'geography', difficulty: 'easy', language: 'hi' },
    { text: 'क्रिकेट में एक ओवर में कितनी गेंदें होती हैं?', answer: '6', aliases: ['छह', 'six'], explanation: 'क्रिकेट में एक ओवर में 6 गेंदें फेंकी जाती हैं।', category: 'sports', difficulty: 'easy', language: 'hi' },
    { text: 'रामायण किसने लिखी?', answer: 'वाल्मीकि', aliases: ['महर्षि वाल्मीकि', 'Valmiki'], explanation: 'महर्षि वाल्मीकि ने संस्कृत में रामायण की रचना की।', category: 'literature', difficulty: 'medium', language: 'hi' },
    { text: 'भारत की मुद्रा का क्या नाम है?', answer: 'रुपया', aliases: ['भारतीय रुपया', 'Rupee', 'Indian Rupee'], explanation: 'भारतीय रुपया (₹) भारत की आधिकारिक मुद्रा है।', category: 'current_affairs', difficulty: 'easy', language: 'hi' },
];
async function seed() {
    const db = knex({
        client: 'mysql2',
        connection: {
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            charset: 'utf8mb4',
        },
    });
    try {
        // Check if questions already exist
        const existing = await db('questions').count('* as count').first();
        if (existing && Number(existing.count) > 0) {
            console.log(`⚠️  Questions already seeded (${existing.count} found). Skipping.`);
            return;
        }
        const allQuestions = [...ENGLISH_QUESTIONS, ...HINDI_QUESTIONS];
        console.log(`📝 Seeding ${allQuestions.length} built-in questions...`);
        for (const q of allQuestions) {
            const questionId = uuid();
            const versionId = uuid();
            await db.transaction(async (trx) => {
                await trx('questions').insert({
                    id: questionId,
                    current_version: 1,
                    source_type: 'builtin',
                    status: 'approved',
                    category: q.category,
                    difficulty: q.difficulty,
                    language: q.language,
                    duplicate_fingerprint: q.text.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 200),
                });
                await trx('question_versions').insert({
                    id: versionId,
                    question_id: questionId,
                    version_number: 1,
                    question_text: q.text,
                    canonical_answer: q.answer,
                    accepted_aliases: JSON.stringify(q.aliases),
                    explanation: q.explanation,
                    source_references: JSON.stringify({ type: 'builtin_curated' }),
                    validation_metadata: JSON.stringify({ verified: true, source: 'curated' }),
                });
            });
        }
        console.log(`✅ Seeded ${allQuestions.length} questions successfully`);
    }
    catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
    finally {
        await db.destroy();
    }
}
seed();
//# sourceMappingURL=seed.js.map