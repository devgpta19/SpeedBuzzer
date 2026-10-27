import { getDb } from '../db/connection.js';
import {
  QuestionCategory, QuestionDifficulty, QuestionSource,
  SupportedLanguage, QuestionDisplay, QuestionReveal,
} from 'speed-buzzer-shared';

export interface QuestionRecord {
  id: string;
  text: string;
  canonicalAnswer: string;
  aliases: string[];
  explanation: string | null;
  category: string;
  difficulty: string;
  language: string;
  source: string;
  options?: string[];
}

const CURATED_OPTIONS_MAP: Record<string, string[]> = {
  'What is the capital of France?': ['Paris', 'Lyon', 'Marseille', 'Nice'],
  'How many continents are there on Earth?': ['7', '5', '6', '8'],
  'What color are emeralds?': ['Green', 'Blue', 'Red', 'Yellow'],
  'What is the largest ocean on Earth?': ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
  'In which country is the Eiffel Tower located?': ['France', 'Italy', 'Germany', 'Spain'],
  'What gas do plants primarily absorb from the atmosphere?': ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'],
  'How many legs does a spider have?': ['8', '6', '10', '12'],
  'What is the boiling point of water in Celsius?': ['100', '90', '120', '80'],
  'What planet is known as the Red Planet?': ['Mars', 'Venus', 'Jupiter', 'Saturn'],
  'What is H₂O commonly known as?': ['Water', 'Hydrogen Peroxide', 'Heavy Water', 'Salt'],
  'Which organ pumps blood throughout the human body?': ['Heart', 'Lungs', 'Brain', 'Liver'],
  'What force keeps us on the ground?': ['Gravity', 'Magnetism', 'Friction', 'Inertia'],
  'What is the chemical symbol for gold?': ['Au', 'Ag', 'Fe', 'Cu'],
  'What is the powerhouse of the cell?': ['Mitochondria', 'Ribosome', 'Nucleus', 'Golgi apparatus'],
  'What is the speed of light in kilometers per second (approximately)?': ['300,000', '150,000', '500,000', '1,000,000'],
  'What element has the atomic number 1?': ['Hydrogen', 'Helium', 'Lithium', 'Carbon'],
  'How many bones are in the adult human body?': ['206', '195', '212', '224'],
  'What is the largest planet in our solar system?': ['Jupiter', 'Saturn', 'Neptune', 'Earth'],
  'What is the most abundant gas in Earth\'s atmosphere?': ['Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide'],
  'Who was the first President of the United States?': ['George Washington', 'Thomas Jefferson', 'John Adams', 'Abraham Lincoln'],
  'In which year did World War II end?': ['1945', '1939', '1944', '1950'],
  'Who discovered America in 1492?': ['Christopher Columbus', 'Ferdinand Magellan', 'Marco Polo', 'Vasco da Gama'],
  'What ancient civilization built the pyramids of Giza?': ['Ancient Egyptians', 'Mesopotamians', 'Romans', 'Mayans'],
  'In which year did India gain independence from Britain?': ['1947', '1950', '1942', '1935'],
  'Who painted the Mona Lisa?': ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh'],
  'What treaty ended World War I?': ['Treaty of Versailles', 'Treaty of Paris', 'Treaty of Ghent', 'Treaty of Utrecht'],
  'Who was the first Emperor of Rome?': ['Augustus', 'Julius Caesar', 'Nero', 'Marcus Aurelius'],
  'What is the longest river in the world?': ['Nile', 'Amazon', 'Yangtze', 'Mississippi'],
  'Which is the smallest country in the world?': ['Vatican City', 'Monaco', 'San Marino', 'Liechtenstein'],
  'What is the capital of Japan?': ['Tokyo', 'Kyoto', 'Osaka', 'Seoul'],
  'Which desert is the largest hot desert in the world?': ['Sahara', 'Gobi', 'Kalahari', 'Arabian'],
  'What is the tallest mountain in the world?': ['Mount Everest', 'K2', 'Kangchenjunga', 'Kilimanjaro'],
  'What is the deepest point in Earth\'s oceans?': ['Mariana Trench', 'Puerto Rico Trench', 'Java Trench', 'Tonga Trench'],
  'How many players are on a standard soccer team on the field?': ['11', '9', '10', '12'],
  'In which sport is the term "love" used to mean zero?': ['Tennis', 'Badminton', 'Golf', 'Cricket'],
  'Which country has won the most FIFA World Cups?': ['Brazil', 'Germany', 'Italy', 'Argentina'],
  'In cricket, how many runs is a maximum hit over the boundary without bouncing?': ['6', '4', '8', '5'],
  'What is the name of the wizarding school in Harry Potter?': ['Hogwarts', 'Ilvermorny', 'Beauxbatons', 'Durmstrang'],
  'Who directed the movie "Titanic"?': ['James Cameron', 'Steven Spielberg', 'Christopher Nolan', 'Martin Scorsese'],
  'What animated movie features a clownfish named Nemo?': ['Finding Nemo', 'Shark Tale', 'The Little Mermaid', 'Moana'],
  'Who wrote "Romeo and Juliet"?': ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'],
  'What is the name of the hobbit in J.R.R. Tolkien\'s "The Hobbit"?': ['Bilbo Baggins', 'Frodo Baggins', 'Samwise Gamgee', 'Gandalf'],
  'What does "HTML" stand for?': ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Text Module Language', 'HyperTool Multi Language'],
  'Who co-founded Apple Inc.?': ['Steve Jobs', 'Bill Gates', 'Mark Zuckerberg', 'Elon Musk'],
  'What programming language is known for its coffee cup logo?': ['Java', 'Python', 'C++', 'JavaScript'],
  'What year was the first iPhone released?': ['2007', '2005', '2008', '2010'],
  'What is the value of Pi to two decimal places?': ['3.14', '3.16', '3.12', '3.18'],
  'What is the square root of 144?': ['12', '14', '11', '16'],
  'What is a triangle with all equal sides called?': ['Equilateral triangle', 'Isosceles triangle', 'Scalene triangle', 'Right-angled triangle'],
  'What is the currency of Japan?': ['Yen', 'Won', 'Yuan', 'Ringgit'],
  'What is the currency of India?': ['Indian Rupee', 'Taka', 'Dinar', 'Rupiah'],
  'How many keys does a standard piano have?': ['88', '76', '61', '92'],
  'Who is known as the "King of Pop"?': ['Michael Jackson', 'Elvis Presley', 'Prince', 'Freddie Mercury'],
  'What is the fastest land animal?': ['Cheetah', 'Lion', 'Pronghorn', 'Leopard'],
  'What is the largest mammal in the world?': ['Blue whale', 'African Elephant', 'Fin Whale', 'Sperm Whale'],
  'In Greek mythology, who is the king of the gods?': ['Zeus', 'Poseidon', 'Hades', 'Apollo'],
  'In Hindu mythology, who is known as the Destroyer?': ['Shiva', 'Brahma', 'Vishnu', 'Indra'],
  'भारत की राजधानी क्या है?': ['नई दिल्ली', 'मुंबई', 'कोलकाता', 'चेन्नई'],
  'भारत का राष्ट्रीय पशु कौन सा है?': ['बाघ', 'शेर', 'हाथी', 'चीता'],
  'भारत का राष्ट्रीय फूल क्या है?': ['कमल', 'गुलाब', 'गेंदा', 'सूरजमुखी'],
  'महात्मा गांधी का पूरा नाम क्या था?': ['मोहनदास करमचंद गांधी', 'करमचंद गांधी', 'जवाहरलाल नेहरू', 'सुभाष चंद्र बोस'],
  'पृथ्वी सूर्य के चारों ओर एक चक्कर कितने दिनों में लगाती है?': ['365', '360', '300', '400'],
  'भारत की सबसे लंबी नदी कौन सी है?': ['गंगा', 'यमुना', 'गोदावरी', 'नर्मदा'],
  'विश्व का सबसे ऊँचा पर्वत शिखर कौन सा है?': ['माउंट एवरेस्ट', 'के2', 'कंचनजंघा', 'नंदा देवी'],
  'क्रिकेट में एक ओवर में कितनी गेंदें होती हैं?': ['6', '4', '8', '5'],
  'रामायण किसने लिखी?': ['वाल्मीकि', 'तुलसीदास', 'वेदव्यास', 'कालिदास'],
  'भारत की मुद्रा का क्या नाम है?': ['रुपया', 'टका', 'डॉलर', 'दिनार'],
};

function shuffleOptions<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class QuestionService {

  /**
   * Fetch a set of questions for a match
   */
  async getQuestionsForMatch(
    count: number,
    category: QuestionCategory,
    difficulty: QuestionDifficulty,
    language: SupportedLanguage,
    source: QuestionSource = QuestionSource.BUILTIN
  ): Promise<QuestionRecord[]> {
    const db = getDb();

    let query = db('questions as q')
      .join('question_versions as qv', function () {
        this.on('qv.question_id', '=', 'q.id')
          .andOn('qv.version_number', '=', 'q.current_version');
      })
      .where('q.status', 'approved')
      .where('q.language', language);

    if (category !== QuestionCategory.MIXED) {
      query = query.where('q.category', category);
    }

    // Include questions at and below selected difficulty
    query = query.where('q.difficulty', difficulty);

    if (source !== QuestionSource.MIXED) {
      query = query.where('q.source_type', source === QuestionSource.BUILTIN ? 'builtin' : source);
    }

    const questions = await query
      .select(
        'q.id',
        'qv.question_text as text',
        'qv.canonical_answer as canonicalAnswer',
        'qv.accepted_aliases as aliases',
        'qv.explanation',
        'q.category',
        'q.difficulty',
        'q.language',
        'q.source_type as source'
      )
      .orderByRaw('RAND()')
      .limit(count);

    if (questions.length < count) {
      // Fallback: get any approved questions in the language
      const fallbackNeeded = count - questions.length;
      const existingIds = questions.map((q: any) => q.id);

      let fallbackQuery = db('questions as q')
        .join('question_versions as qv', function () {
          this.on('qv.question_id', '=', 'q.id')
            .andOn('qv.version_number', '=', 'q.current_version');
        })
        .where('q.status', 'approved')
        .where('q.language', language);

      if (existingIds.length > 0) {
        fallbackQuery = fallbackQuery.whereNotIn('q.id', existingIds);
      }

      const fallback = await fallbackQuery
        .select(
          'q.id',
          'qv.question_text as text',
          'qv.canonical_answer as canonicalAnswer',
          'qv.accepted_aliases as aliases',
          'qv.explanation',
          'q.category',
          'q.difficulty',
          'q.language',
          'q.source_type as source'
        )
        .orderByRaw('RAND()')
        .limit(fallbackNeeded);

      questions.push(...fallback);
    }

    return questions.map((q: any) => ({
      id: q.id,
      text: q.text,
      canonicalAnswer: q.canonicalAnswer,
      aliases: typeof q.aliases === 'string' ? JSON.parse(q.aliases) : (q.aliases || []),
      explanation: q.explanation,
      category: q.category,
      difficulty: q.difficulty,
      language: q.language,
      source: q.source,
    }));
  }

  /**
   * Create a display-safe version (no answer)
   */
  toDisplay(question: QuestionRecord, questionNumber: number, totalQuestions: number): QuestionDisplay {
    let options = question.options;
    if (!options || options.length === 0) {
      if (CURATED_OPTIONS_MAP[question.text]) {
        options = shuffleOptions(CURATED_OPTIONS_MAP[question.text]);
      } else {
        const generic = ['None of these', 'All of the above', 'Both A and B'];
        options = shuffleOptions([question.canonicalAnswer, ...generic]);
      }
      question.options = options;
    }

    return {
      id: question.id,
      text: question.text,
      category: question.category as QuestionCategory,
      difficulty: question.difficulty as QuestionDifficulty,
      language: question.language as SupportedLanguage,
      questionNumber,
      totalQuestions,
      options,
    };
  }

  /**
   * Create a reveal payload (with answer)
   */
  toReveal(question: QuestionRecord): QuestionReveal {
    return {
      questionId: question.id,
      correctAnswer: question.canonicalAnswer,
      explanation: question.explanation,
      aliases: question.aliases,
      source: question.source as QuestionSource,
    };
  }

  /**
   * Check if an answer is correct
   */
  checkAnswer(
    submittedAnswer: string,
    canonicalAnswer: string,
    aliases: string[]
  ): boolean {
    const normalize = (s: string): string => {
      return s
        .toLowerCase()
        .trim()
        .replace(/[\s]+/g, ' ')       // collapse whitespace
        .replace(/[.,;:!?'"()[\]{}]/g, '') // strip punctuation
        .replace(/^(the|a|an)\s+/i, '')  // strip leading articles
        .normalize('NFC');              // Unicode normalization
    };

    const normalized = normalize(submittedAnswer);
    const correctNormalized = normalize(canonicalAnswer);

    // Direct match
    if (normalized === correctNormalized) return true;

    // Check aliases
    for (const alias of aliases) {
      if (normalize(alias) === normalized) return true;
    }

    // Fuzzy: check if answer contains the canonical answer or vice versa
    // (for longer answers like descriptions)
    if (correctNormalized.length > 3 && normalized.includes(correctNormalized)) return true;
    if (normalized.length > 3 && correctNormalized.includes(normalized)) return true;

    return false;
  }
}

export const questionService = new QuestionService();
