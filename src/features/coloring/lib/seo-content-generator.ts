/**
 * SEO Content Generator for Coloring Pages
 *
 * Produces differentiated, crawlable text content for each coloring page.
 * Uses multi-dimensional variation (difficulty, style, scene, age, tips)
 * to avoid scaled-template detection.
 */

// ---------- Types ----------

interface PageInput {
    title: string;
    slug: string;
    category: string;
    subCategory?: string;
    keywords?: string[];
    description?: string;
    imageSrc: string;
    rootKeyword?: string | null;
    modifier?: string | null;
    /** Whether the hub page has actual content (prevents broken internal links) */
    hubHasContent?: boolean;
}

interface SeoContentResult {
    /** Rendered HTML string for below-the-canvas section */
    htmlContent: string;
    /** JSON-LD object for ImageObject */
    imageJsonLd: Record<string, unknown>;
    /** JSON-LD object for BreadcrumbList */
    breadcrumbJsonLd: Record<string, unknown>;
    /** FAQ items (plain objects, for potential FAQPage JSON-LD) */
    faqItems: { question: string; answer: string }[];
}

// ---------- Dimension Inference ----------

type Difficulty = 'easy' | 'medium' | 'detailed';
type AgeGroup = 'toddlers' | 'kids' | 'older-kids' | 'adults';
type ArtStyle = 'cartoon' | 'kawaii' | 'realistic' | 'mandala' | 'simple' | 'aesthetic' | 'classic';

const DIFFICULTY_KEYWORDS: Record<Difficulty, string[]> = {
    easy: ['simple', 'easy', 'basic', 'beginner', 'preschool'],
    medium: ['cartoon', 'cute', 'kawaii', 'fun', 'happy', 'friendly'],
    detailed: ['detailed', 'intricate', 'complex', 'mandala', 'advanced', 'realistic', 'aesthetic'],
};

const AGE_KEYWORDS: Record<AgeGroup, string[]> = {
    toddlers: ['toddler', 'toddlers', 'preschool', 'baby', 'simple'],
    kids: ['kids', 'children', 'child', 'easy', 'fun'],
    'older-kids': ['school', 'cartoon', 'cool', 'awesome'],
    adults: ['adult', 'adults', 'detailed', 'intricate', 'mandala', 'complex', 'advanced', 'realistic'],
};

const STYLE_KEYWORDS: Record<ArtStyle, string[]> = {
    cartoon: ['cartoon', 'toon', 'animated'],
    kawaii: ['kawaii', 'cute', 'adorable', 'chibi'],
    realistic: ['realistic', 'real', 'lifelike', 'detailed'],
    mandala: ['mandala', 'pattern', 'geometric', 'zentangle'],
    simple: ['simple', 'easy', 'basic', 'outline'],
    aesthetic: ['aesthetic', 'beautiful', 'elegant', 'pretty'],
    classic: [],
};

function inferDifficulty(slug: string, keywords: string[]): Difficulty {
    const text = [slug, ...keywords].join(' ').toLowerCase();
    if (DIFFICULTY_KEYWORDS.detailed.some((k) => text.includes(k))) return 'detailed';
    if (DIFFICULTY_KEYWORDS.easy.some((k) => text.includes(k))) return 'easy';
    return 'medium';
}

function inferAgeGroup(slug: string, keywords: string[]): AgeGroup {
    const text = [slug, ...keywords].join(' ').toLowerCase();
    if (AGE_KEYWORDS.adults.some((k) => text.includes(k))) return 'adults';
    if (AGE_KEYWORDS.toddlers.some((k) => text.includes(k))) return 'toddlers';
    if (AGE_KEYWORDS['older-kids'].some((k) => text.includes(k))) return 'older-kids';
    return 'kids';
}

function inferStyle(slug: string, keywords: string[]): ArtStyle {
    const text = [slug, ...keywords].join(' ').toLowerCase();
    for (const [style, kws] of Object.entries(STYLE_KEYWORDS) as [ArtStyle, string[]][]) {
        if (kws.some((k) => text.includes(k))) return style;
    }
    return 'classic';
}

// ---------- Stable Pseudo-Random from Slug ----------

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function pick<T>(arr: T[], slug: string, offset = 0): T {
    return arr[(hashCode(slug) + offset) % arr.length];
}

// ---------- Template Pools ----------

const DIFFICULTY_DESC: Record<Difficulty, string[]> = {
    easy: [
        'Features bold, thick outlines that are easy for little hands to follow.',
        'Designed with large areas and simple shapes — no fiddly details to worry about.',
        'Clean, wide outlines make this page forgiving and stress-free for beginners.',
    ],
    medium: [
        'Balanced design with clear outlines and enough detail to keep things interesting.',
        'A medium-complexity illustration that works well with crayons, colored pencils, or markers.',
        'Nicely detailed without being overwhelming — a great all-rounder for most skill levels.',
    ],
    detailed: [
        'Packed with intricate patterns and fine lines for a satisfying, immersive coloring session.',
        'A highly detailed design that rewards patience — perfect for focused, meditative coloring.',
        'Rich line-work with layered details that encourage creative color choices.',
    ],
};

const AGE_DESC: Record<AgeGroup, string[]> = {
    toddlers: [
        'Ideal for toddlers aged 2–4 who are just discovering the joy of coloring.',
        'Perfect first coloring experience for preschoolers developing fine motor skills.',
        'Thick outlines and simple shapes make this great for tiny artists just starting out.',
    ],
    kids: [
        'A wonderful activity for children aged 4–8, whether at home, school, or on the go.',
        'Great for elementary-age kids who enjoy creative art time after school.',
        'Engaging enough to hold attention while building hand-eye coordination.',
    ],
    'older-kids': [
        'Suited for older children aged 8–12 who want a bit more challenge in their coloring.',
        'A step up from basic pages — perfect for kids who have outgrown simple outlines.',
        'Offers just the right amount of detail for tweens looking for creative downtime.',
    ],
    adults: [
        'A relaxing coloring experience for teens and adults seeking creative stress relief.',
        'Intricate enough to be genuinely meditative — pair with your favorite podcast or playlist.',
        'Adult-friendly complexity that makes for a rewarding art-therapy session.',
    ],
};

const STYLE_DESC: Record<ArtStyle, string[]> = {
    cartoon: ['Drawn in a playful cartoon style with exaggerated features and expressive lines.'],
    kawaii: ['Kawaii-inspired design with big eyes, soft curves, and an irresistibly cute vibe.'],
    realistic: ['Rendered in a realistic style with anatomically accurate proportions and natural details.'],
    mandala: ['Presented as a mandala-style pattern with symmetrical, repeating motifs radiating from the center.'],
    simple: ['A minimalist outline with clean lines and plenty of white space for creative freedom.'],
    aesthetic: ['An aesthetically pleasing composition with graceful lines and harmonious proportions.'],
    classic: ['A classic coloring-book illustration with clear outlines and well-defined areas.'],
};

const SCENE_TEMPLATES = [
    'The composition features the main subject in a {setting}, creating a {mood} atmosphere.',
    'Set against a {setting} backdrop, this illustration evokes a sense of {mood}.',
    'This charming scene places the subject in a {setting}, conveying a {mood} feeling throughout.',
];

const SETTINGS_BY_CATEGORY: Record<string, string[]> = {
    animals: ['natural habitat', 'garden meadow', 'cozy indoor scene', 'woodland clearing', 'sunny farm'],
    nature: ['lush garden', 'outdoor landscape', 'peaceful riverside', 'mountain vista', 'forest path'],
    vehicles: ['busy street', 'open road', 'scenic highway', 'bustling city', 'countryside lane'],
    fantasy: ['enchanted forest', 'magical kingdom', 'starlit sky', 'crystal cave', 'fairy garden'],
    holidays: ['festive celebration', 'decorated home', 'seasonal setting', 'holiday party', 'winter wonderland'],
    food: ['kitchen table', 'picnic blanket', 'bakery window', 'fruit stand', 'cozy café'],
    sports: ['playing field', 'sports arena', 'outdoor court', 'gymnasium', 'park playground'],
    characters: ['everyday scene', 'playful backdrop', 'adventure setting', 'school yard', 'home environment'],
};

const MOODS = ['cheerful', 'calm', 'whimsical', 'adventurous', 'cozy', 'joyful', 'playful', 'serene'];

const USE_SCENARIOS = [
    'Works beautifully as a classroom activity during art or free-choice time.',
    'A perfect rainy-day activity to keep kids happily occupied indoors.',
    'Great for a quiet homeschool art session or creative break between subjects.',
    'Ideal as a birthday-party favor — print several copies for all the guests!',
    'Makes a lovely weekend craft project when paired with your favorite coloring supplies.',
    'A wonderful travel companion — print it out before your next road trip or flight.',
    'Perfect for winding down before bedtime — a calming alternative to screen time.',
    'Use it as a greeting card: color, fold, and gift it to someone you love.',
];

const COLORING_TIPS_BY_CATEGORY: Record<string, string[]> = {
    animals: [
        'Start with the lightest fur colors and build up to darker shading around the edges.',
        'Try different shades of brown to give the fur texture and depth.',
        'Leave the eyes for last — a tiny white highlight dot brings them to life instantly.',
        'Use short, directional strokes to mimic the look of real fur.',
    ],
    nature: [
        'Layer multiple greens from light to dark for realistic-looking foliage.',
        'Add a soft yellow highlight where sunlight would naturally hit the petals.',
        'Blend blue and purple at the horizon for a dreamy sky background.',
        'Use circular motions when shading flower centers for a natural pollen effect.',
    ],
    vehicles: [
        'Use a metallic silver or grey for chrome and reflective surfaces.',
        'Add a light blue reflection line along windows and windshields for realism.',
        'Color the wheels with layered grey and black for a three-dimensional look.',
        'Try bold, saturated colors for the body — fire-engine red always looks fantastic.',
    ],
    fantasy: [
        'Rainbow gradients work perfectly on horns, wings, and magical accessories.',
        'Use pastel colors for a dreamy, ethereal atmosphere.',
        'Add sparkle effects by leaving tiny white dots uncolored in strategic spots.',
        'Mix warm gold tones with cool purples for a truly magical color palette.',
    ],
    holidays: [
        'Stick to traditional holiday color palettes for an instantly festive feel.',
        'Metallic gold and silver pens add a special touch to ornaments and decorations.',
        'Layer red and green carefully to avoid muddying — let each color dry first.',
        'Add glitter glue after coloring for an extra-special handmade greeting card.',
    ],
    food: [
        'Reference real photos for accurate fruit and vegetable colors.',
        'Add a subtle shadow underneath the food item to make it pop off the page.',
        'Use warm, appetizing colors — oranges, reds, and golden yellows work best.',
        'Leave a small white streak on shiny surfaces to simulate a glossy highlight.',
    ],
    sports: [
        'Use your favorite team\'s colors for jerseys and equipment.',
        'Add motion lines in light grey to suggest speed and movement.',
        'Color grass with varied greens for a realistic playing-field effect.',
        'Bold primary colors make sports equipment look eye-catching and dynamic.',
    ],
    default: [
        'Start with lighter colors and gradually work toward darker shades.',
        'Press gently for a first layer, then add pressure for richer, deeper tones.',
        'Color in one direction for a smoother, more polished finish.',
        'Test your colors on scrap paper first to make sure you like the combination.',
    ],
};

const HOW_TO_SECTIONS = [
    {
        printTitle: 'Print It',
        printDesc: 'Click the download button above to get a high-resolution image. Print on standard letter-size (A4) paper for the best results.',
    },
    {
        printTitle: 'Download & Print',
        printDesc: 'Hit the download button to save the full-resolution file. We recommend printing on thick paper or cardstock for crayon and marker use.',
    },
];

const BENEFIT_INTROS = [
    'Coloring is more than just fun — research shows it actively supports child development.',
    'Beyond entertainment, coloring offers real developmental benefits for growing minds.',
    'There\'s a reason educators love coloring activities — the benefits go well beyond the art.',
];

const BENEFITS = [
    'Strengthens fine motor skills and hand-eye coordination through controlled hand movements.',
    'Encourages focus, patience, and the ability to complete a task from start to finish.',
    'Provides a screen-free creative outlet that promotes relaxation and mindfulness.',
    'Helps children learn color recognition, spatial awareness, and compositional thinking.',
    'Builds confidence as kids see their blank page transform into a finished work of art.',
];

// ---------- FAQ Generation ----------

function generateFaqItems(
    title: string,
    category: string,
    difficulty: Difficulty,
    ageGroup: AgeGroup,
    slug: string,
): { question: string; answer: string }[] {
    const name = title.replace(/ Coloring Page$/i, '');
    const difficultyMap: Record<Difficulty, string> = {
        easy: 'easy, with thick outlines and large areas — suitable for beginners and toddlers',
        medium: 'moderate, with clear outlines and some detail — great for most children',
        detailed: 'detailed, with intricate patterns — best for older kids and adults who enjoy a challenge',
    };
    const ageMap: Record<AgeGroup, string> = {
        toddlers: 'toddlers and preschoolers (ages 2–4)',
        kids: 'children aged 4–8',
        'older-kids': 'older children aged 8–12',
        adults: 'teens and adults',
    };

    const base = [
        {
            question: `Is this ${name} coloring page free to print?`,
            answer: `Yes! This ${name} coloring page is completely free. Click the download button to save the high-resolution image file, then print it at home on any standard printer.`,
        },
        {
            question: `What age group is this ${name} coloring page best for?`,
            answer: `This page is primarily designed for ${ageMap[ageGroup]}. The difficulty level is ${difficultyMap[difficulty]}.`,
        },
        {
            question: `What coloring supplies work best for this page?`,
            answer:
                difficulty === 'detailed'
                    ? 'Colored pencils and fine-tip markers work best for this detailed design. They allow precise coloring within the intricate patterns.'
                    : difficulty === 'easy'
                        ? 'Crayons and thick markers are ideal for this simple design. The wide outlines are forgiving and perfect for younger hands.'
                        : 'Crayons, colored pencils, and markers all work well. Choose whichever medium your child enjoys most!',
        },
    ];

    // Add a category-specific FAQ
    const catFaqPool: Record<string, { question: string; answer: string }[]> = {
        animals: [
            {
                question: `Can I use this ${name} page for a school project?`,
                answer: `Absolutely! Many teachers use our animal coloring pages for science units, reading comprehension activities, and creative writing prompts. Feel free to print as many copies as you need for classroom use.`,
            },
        ],
        fantasy: [
            {
                question: `Are there more ${category} coloring pages available?`,
                answer: `Yes! We have a growing collection of ${category.toLowerCase()} coloring pages. Browse our ${category} category page to see all available designs, from unicorns to dragons and beyond.`,
            },
        ],
        nature: [
            {
                question: `Can this page be used for nature study?`,
                answer: `Definitely! Coloring nature illustrations helps children observe details they might otherwise miss — leaf shapes, petal arrangements, and natural patterns. It complements any nature or botany lesson.`,
            },
        ],
    };

    const catFaq = catFaqPool[category.toLowerCase()]?.[0];
    if (catFaq) base.push(catFaq);

    return base;
}

// ---------- Main Generator ----------

export function generateSeoContent(page: PageInput, appUrl = 'https://coloringpages.club'): SeoContentResult {
    const { title, slug, category, subCategory, keywords = [], imageSrc, rootKeyword, modifier, hubHasContent } = page;
    const cleanTitle = title.replace(/ Coloring Page$/i, '');
    const categoryName = formatCategoryName(category);

    const difficulty = inferDifficulty(slug, keywords);
    const ageGroup = inferAgeGroup(slug, keywords);
    const style = inferStyle(slug, keywords);
    const h = hashCode(slug);

    // ---- Build HTML sections ----

    const sections: string[] = [];

    // 1. About section
    const styleDesc = pick(STYLE_DESC[style], slug, 0);
    const diffDesc = pick(DIFFICULTY_DESC[difficulty], slug, 1);
    const ageDesc = pick(AGE_DESC[ageGroup], slug, 2);

    const settings = SETTINGS_BY_CATEGORY[category.toLowerCase()] || SETTINGS_BY_CATEGORY.animals!;
    const setting = pick(settings, slug, 3);
    const mood = pick(MOODS, slug, 4);
    const sceneTemplate = pick(SCENE_TEMPLATES, slug, 5);
    const sceneDesc = sceneTemplate
        .replace('{setting}', setting)
        .replace('{mood}', mood);

    sections.push(`<section class="seo-section">
<h2>About This ${cleanTitle} Coloring Page</h2>
<p>${styleDesc} ${sceneDesc}</p>
<p>${diffDesc} ${ageDesc}</p>
</section>`);

    // 2. How to Use section
    const howTo = pick(HOW_TO_SECTIONS, slug, 6);
    sections.push(`<section class="seo-section">
<h2>How to Use This Coloring Page</h2>
<ul>
<li><strong>${howTo.printTitle}:</strong> ${howTo.printDesc}</li>
<li><strong>Color Online:</strong> Use our interactive coloring tool above — pick colors, fill areas, and save your progress right in the browser.</li>
</ul>
</section>`);

    // 3. Coloring Tips
    const tipPool = COLORING_TIPS_BY_CATEGORY[category.toLowerCase()] || COLORING_TIPS_BY_CATEGORY.default!;
    const tipA = pick(tipPool, slug, 7);
    const tipB = pick(tipPool, slug, 8);

    sections.push(`<section class="seo-section">
<h2>Coloring Tips for This ${categoryName} Page</h2>
<ul>
<li>${tipA}</li>
<li>${tipB}</li>
</ul>
</section>`);

    // 4. Use scenario
    const scenario = pick(USE_SCENARIOS, slug, 9);
    const benefitIntro = pick(BENEFIT_INTROS, slug, 10);
    const benefitA = pick(BENEFITS, slug, 11);
    const benefitB = pick(BENEFITS, slug, 12);

    sections.push(`<section class="seo-section">
<h2>Why Coloring Is Great for ${ageGroup === 'adults' ? 'Everyone' : 'Kids'}</h2>
<p>${benefitIntro}</p>
<ul>
<li>${benefitA}</li>
<li>${benefitB}</li>
</ul>
<p>${scenario}</p>
</section>`);

    // 5. FAQ
    const faqItems = generateFaqItems(title, category, difficulty, ageGroup, slug);
    const faqHtml = faqItems
        .map(
            (f) => `<details class="seo-faq-item">
<summary>${f.question}</summary>
<p>${f.answer}</p>
</details>`,
        )
        .join('\n');

    sections.push(`<section class="seo-section seo-faq">
<h2>Frequently Asked Questions</h2>
${faqHtml}
</section>`);

    const htmlContent = `<article class="seo-content">\n${sections.join('\n')}\n</article>`;

    // ---- JSON-LD ----

    const pageUrl = `${appUrl}/${slug}`;

    const imageJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        name: title,
        description: page.description || `Free printable ${cleanTitle.toLowerCase()} coloring page`,
        contentUrl: imageSrc,
        url: pageUrl,
        thumbnailUrl: imageSrc,
        representativeOfPage: true,
        creditText: 'ColoringPages.club',
        copyrightNotice: `© ${new Date().getFullYear()} ColoringPages.club`,
        acquireLicensePage: `${appUrl}/terms-of-service`,
    };

    const breadcrumbItems: Record<string, unknown>[] = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: appUrl },
    ];

    // Only add hub breadcrumb if the hub actually has content (prevents broken internal links)
    if (rootKeyword && hubHasContent !== false) {
        const hubSlug = rootKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        breadcrumbItems.push({
            '@type': 'ListItem',
            position: 2,
            name: `${formatCategoryName(rootKeyword)} Coloring Pages`,
            item: `${appUrl}/${hubSlug}-coloring-pages`,
        });
        breadcrumbItems.push({ '@type': 'ListItem', position: 3, name: title, item: pageUrl });
    } else if (category) {
        breadcrumbItems.push({
            '@type': 'ListItem',
            position: 2,
            name: `${categoryName} Coloring Pages`,
            item: `${appUrl}/${category.toLowerCase()}`,
        });
        breadcrumbItems.push({ '@type': 'ListItem', position: 3, name: title, item: pageUrl });
    } else {
        breadcrumbItems.push({ '@type': 'ListItem', position: 2, name: title, item: pageUrl });
    }

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
    };

    return { htmlContent, imageJsonLd, breadcrumbJsonLd, faqItems };
}

// ---------- Category / Hub Content Generator ----------

export function generateCategoryContent(
    categoryName: string,
    categorySlug: string,
    subCategories: { name: string; slug: string; count: number }[],
    totalPages: number,
): string {
    const lc = categoryName.toLowerCase();
    const h = hashCode(categorySlug);

    const sections: string[] = [];

    // 1. Main introduction
    sections.push(`<section class="seo-section">
<h2>Discover Our ${categoryName} Coloring Pages Collection</h2>
<p>Welcome to our curated library of <strong>free printable ${lc} coloring pages</strong>! We currently offer <strong>${totalPages} unique designs</strong> spanning a wide range of styles, difficulty levels, and themes. Every page is free to download, print, and share — no registration required.</p>
<p>Whether you're a parent looking for a <strong>screen-free activity</strong>, a teacher planning an art-class project, or an adult seeking a relaxing creative outlet, you'll find something here that sparks inspiration. Our collection ranges from simple outlines for toddlers to detailed illustrations that challenge experienced colorists.</p>
</section>`);

    // 2. Sub-category highlights
    if (subCategories.length > 0) {
        const subList = subCategories
            .slice(0, 8)
            .map(
                (sc) =>
                    `<li><strong><a href="/${categorySlug}/${sc.slug}">${sc.name}</a></strong> — ${sc.count} page${sc.count !== 1 ? 's' : ''} featuring unique ${sc.name.toLowerCase()} designs.</li>`,
            )
            .join('\n');

        sections.push(`<section class="seo-section">
<h2>Browse ${categoryName} by Theme</h2>
<ul>
${subList}
</ul>
</section>`);
    }

    // 3. Educational value
    const eduTemplates = [
        `<p>Coloring ${lc} illustrations helps children develop <strong>observational skills</strong> — they learn to notice shapes, proportions, and details they might otherwise overlook. For younger kids, it builds foundational skills like grip control and color recognition. For older children and adults, it provides genuine stress relief and a meditative focus that screens simply can't offer.</p>`,
        `<p>Studies show that coloring activities improve <strong>fine motor control</strong>, concentration, and emotional regulation. ${categoryName} pages are especially engaging because they connect art to real-world subjects — encouraging curiosity and conversation beyond the coloring session itself.</p>`,
    ];

    sections.push(`<section class="seo-section">
<h2>Educational Benefits of ${categoryName} Coloring Pages</h2>
${eduTemplates[h % eduTemplates.length]}
<ul>
<li><strong>Fine Motor Skills:</strong> Gripping crayons and coloring within lines strengthens the same hand muscles used for writing.</li>
<li><strong>Focus & Patience:</strong> Completing a page from start to finish builds attention span and a sense of achievement.</li>
<li><strong>Creativity:</strong> Choosing colors and experimenting with combinations nurtures artistic confidence.</li>
<li><strong>Screen-Free Time:</strong> A tangible, offline activity that encourages mindfulness and calm.</li>
</ul>
</section>`);

    // 4. How to get the most out of these pages
    sections.push(`<section class="seo-section">
<h2>Tips for Parents & Teachers</h2>
<ul>
<li><strong>Print on thick paper</strong> (120 gsm+) if using markers to prevent bleed-through.</li>
<li><strong>Let kids choose</strong> their own color schemes — there are no wrong answers in art!</li>
<li><strong>Pair with a lesson:</strong> Use ${lc} pages as a springboard for storytelling, vocabulary, or science activities.</li>
<li><strong>Display finished work:</strong> Hanging completed pages on the fridge or a bulletin board boosts confidence immensely.</li>
<li><strong>Color together:</strong> Adults coloring alongside children models patience, focus, and shared creative joy.</li>
</ul>
</section>`);

    // 5. FAQ
    sections.push(`<section class="seo-section seo-faq">
<h2>Frequently Asked Questions</h2>
<details class="seo-faq-item">
<summary>Are these ${lc} coloring pages really free?</summary>
<p>Yes, every page in our ${lc} collection is 100% free. Download, print, and use them as many times as you like — at home, at school, or anywhere else.</p>
</details>
<details class="seo-faq-item">
<summary>What age group are these pages designed for?</summary>
<p>Our ${lc} collection includes designs for all ages: simple outlines for toddlers (2–4), medium-detail pages for kids (4–8), and intricate illustrations for older children and adults. Each page description notes its recommended age range.</p>
</details>
<details class="seo-faq-item">
<summary>Can I use these pages in my classroom?</summary>
<p>Absolutely! Teachers are welcome to print as many copies as needed for educational use. Many educators incorporate our coloring pages into art periods, reward activities, or subject-specific lessons.</p>
</details>
<details class="seo-faq-item">
<summary>What supplies do I need?</summary>
<p>Any coloring supplies work — crayons, colored pencils, markers, or even watercolors. For best results with markers, print on heavier paper to avoid bleed-through.</p>
</details>
</section>`);

    return `<article class="seo-content seo-category-content">\n${sections.join('\n')}\n</article>`;
}

// ---------- Utils ----------

function formatCategoryName(slug: string): string {
    return slug
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}
