/**
 * AI-powered dimension config generator
 * Automatically generates complete DimensionConfig for new roots
 */

import type { DimensionConfig } from './dimensions/types';

/**
 * Root type classification
 */
export type RootType =
  | 'animal'        // Living creatures
  | 'plant'         // Flowers, trees, plants
  | 'object'        // Inanimate objects
  | 'fantasy'       // Mythical creatures, magic
  | 'holiday'       // Holiday/seasonal themes
  | 'character'     // Human-like characters
  | 'vehicle'       // Transportation
  | 'food'          // Food items
  | 'nature'        // Natural phenomena
  | 'place'         // Locations/structures
  | 'ip'            // IP characters (Hello Kitty, Peppa Pig, Superman, etc.)
  | 'general';      // Default fallback

/**
 * AI-generated dimension config result
 */
export interface AIConfigResult {
  config: DimensionConfig;
  rootType: RootType;
  confidence: number;
}

/**
 * Root type detection patterns
 */
const TYPE_PATTERNS: Record<RootType, RegExp[]> = {
  animal: [
    /\b(dog|cat|bird|fish|lion|tiger|bear|elephant|dinosaur|dragon|unicorn|horse|rabbit|fox|wolf|deer|owl|eagle|snake|frog|turtle|butterfly|bee|spider|penguin|bear|panda|koala|kangaroo|monkey|zebra|giraffe|hippo|crocodile|dolphin|whale|shark)\b/i,
    /\b(baby|mother|father)\s+(animal|creature|beast)\b/i,
  ],
  plant: [
    /\b(flower|rose|tulip|daisy|sunflower|lily|orchid|lotus|blossom|petal|leaf|tree|oak|pine|palm|willow|bonsai|cactus|mushroom|vine|fern|moss)\b/i,
    /\b(rose|lily|daisy|iris|violet|jasmine|lavender|peony|dahlia|marigold|poppy)\b/i,
  ],
  object: [
    /\b(toy|ball|doll|block|puzzle|book|pencil|pen|chair|table|desk|bed|lamp|clock|watch|phone|computer|tablet|camera|musical instrument|instrument)\b/i,
  ],
  fantasy: [
    /\b(unicorn|dragon|fairy|mermaid|wizard|witch|magic|enchanted|mystical|mythical|legendary|creature|beast|monster|ghost|vampire|werewolf|zombie|alien)\b/i,
    /\b(pegasus|alicorn|phoenix|griffin|centaur|minotaur|kraken|leviathan|behemoth|golem|elemental)\b/i,
  ],
  holiday: [
    /\b(christmas|xmas|santa|reindeer|snowman|wreath|poinsettia|holly|mistletoe|easter|bunny|egg|halloween|pumpkin|thanksgiving|turkey|valentine|heart|cupid|independence|flag|firework|new year|eve)\b/i,
  ],
  character: [
    /\b(princess|prince|king|queen|knight|warrior|pirate|ninja|samurai|knight|superhero|villain|doctor|teacher|police|firefighter|astronaut|scientist|artist|musician|dancer|athlete)\b/i,
    /\b(girl|boy|woman|man|child|kid|baby|toddler|teen|adult)\b/i,
  ],
  vehicle: [
    /\b(car|truck|bus|train|plane|airplane|helicopter|boat|ship|rocket|scooter|bicycle|motorcycle|tractor|ambulance|police|fire|jeep|suv|van|tram|subway|ferry|yacht|sailboat)\b/i,
  ],
  food: [
    /\b(apple|banana|orange|strawberry|grape|watermelon|pineapple|mango|peach|cherry|lemon|lime|kiwi|pizza|burger|sandwich|cake|cookie|candy|chocolate|ice cream|donut|cupcake|pie|bread|cheese|pasta|noodle|rice|soup|salad)\b/i,
  ],
  nature: [
    /\b(sun|moon|star|cloud|rain|snow|wind|storm|lightning|rainbow|aurora|mountain|hill|valley|cave|waterfall|river|lake|ocean|sea|beach|island|volcano|earthquake|tornado|hurricane)\b/i,
  ],
  place: [
    /\b(house|home|castle|palace|tower|bridge|monument|statue|fountain|park|garden|farm|city|town|village|school|hospital|library|museum|church|temple|mosque|synagogue)\b/i,
    /\b(bedroom|kitchen|bathroom|living room|dining room|garage|attic|basement|rooftop|balcony|porch|patio|yard|driveway|sidewalk|street|road|highway|freeway)\b/i,
  ],
  ip: [
    // Sanrio characters
    /\b(hello kitty|kuromi|my melody|cinnamoroll|pompompurin|kerokerokeroppi|bad badtz-maru|little twin stars|pochacco|tuxedosam|hangyodon|osaru no monichi|chococat|spottie dottie|purin|dearluna)\b/i,
    // Disney characters
    /\b(mickey mouse|minnie mouse|donald duck|goofy|pluto|daisy duck|chip and dale|winnie the pooh|tigger|piglet|eeyore|rabbit|roo|lumpy|elsa|anna|olaf|moana|maui|ariel|belle|cinderella|snow white|jasmine|aurora|rapunzel|tiana|merida|pocahontas|mulan|sleeping beauty)\b/i,
    // Popular cartoon characters
    /\b(peppa pig|george pig|suzy sheep|rebecca rabbit|danny dog|candy cat|pedro pony|emily elephant|edmond elephant|richard rabbit|freddy fox|wendy wolf|gabriella goat|kylie kangaroo|gerald giraffe)\b/i,
    /\b(paw patrol|chase|marshall|rubble|sky|rocky|zuma|everest|tracker|ryder)\b/i,
    /\b(spider-man|spiderman|batman|superman|wonder woman|iron man|captain america|thor|hulk|black widow|hawkeye|black panther|doctor strange|scarlet witch|ant-man|wasp|flash|aquaman|cyborg)\b/i,
    /\b(spongebob|patrick|squidward|sandy|mr krabs|plankton)\b/i,
    /\b(pokemon|pikachu|charizard|mewtwo|eevee|snorlax|gengar|lucario|mew|gyarados|dragonite|blastoise|venusaur|greninja|ash ketchum|team rocket)\b/i,
    // Anime characters
    /\b(doraemon|nobita|shizuka|takeshi|suneo|dora cake)\b/i,
    /\b(crayon shin-chan|shinchan)\b/i,
    /\b(naruto|sasuke|sakura|kakashi)\b/i,
    /\b(dragon ball|goku|vegeta|bulma|piccolo|gohan|trunks|frieza|cell|buu)\b/i,
    // Studio Ghibli
    /\b(totoro|chihiro|howl|ponyo|mononoke|haku|calcifer|no-face|kiki|jiji)\b/i,
    // Others
    /\b(barbie|ken|skipper|stacie|chelsea|raquelle|ryan)\b/i,
    /\b(thomas the tank engine|james the red engine|percy|gordon|henry|edward)\b/i,
    /\b(bob the builder|scoop|muck|dizzy|roley|lofty|wendy|pilchard|bird|travis|spud)\b/i,
    // General pattern for IP names
    /\b(sanrio|disney|marvel|dc|pixar|dreamworks)\b/i,
  ],
  general: [],
};

/**
 * Detect the type of a root keyword
 */
export function detectRootType(root: string): RootType {
  const lowerRoot = root.toLowerCase().trim();

  for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerRoot)) {
        return type as RootType;
      }
    }
  }

  return 'general';
}

/**
 * Template dimension configs by type
 */
const TYPE_TEMPLATES: Record<RootType, Partial<DimensionConfig>> = {
  animal: {
    dimensions: {
      species: [
        // 热门动物品种
        'golden retriever', 'labrador', 'german shepherd', 'bulldog', 'poodle',
        'siamese cat', 'persian cat', 'maine coon', 'british shorthair', 'scottish fold',
        'african elephant', 'asian elephant', 'bengal tiger', 'siberian tiger', 'white tiger',
        'african lion', 'mountain lion', 'lion cub', 'cheetah', 'leopard',
        'grizzly bear', 'polar bear', 'panda bear', 'koala bear', 'black bear',
        'horse', 'pony', 'zebra', 'giraffe', 'hippopotamus', 'rhinoceros',
        'dolphin', 'killer whale', 'blue whale', 'shark', 'sea turtle',
        'eagle', 'owl', 'parrot', 'flamingo', 'peacock', 'penguin',
        'butterfly', 'bee', 'ladybug', 'dragonfly', 'spider'
      ],
      style: [
        // 基础风格
        'cute', 'simple', 'easy',
        // 专业风格
        'realistic', 'detailed', 'scientific illustration', 'wildlife art',
        'therapeutic', 'mandala style', 'geometric'
      ],
      // 详细场景描述
      environment: [
        // 森林场景
        'in dense forest with sunlight filtering through trees',
        'in bamboo forest', 'in autumn forest with fallen leaves',
        'in rainforest with vines and tropical plants',
        'in pine forest on mountainside',
        // 水边场景
        'drinking from crystal clear stream',
        'wading in shallow pond with lily pads',
        'resting by waterfall with mist',
        'on riverbank with smooth stones',
        'swimming in lake with mountain reflection',
        // 山地场景
        'standing on rocky cliff edge',
        'resting on grassy hilltop',
        'in mountain meadow with wildflowers',
        'cave entrance with stalactites visible',
        // 特殊天气环境
        'walking through morning fog', 'in gentle rain',
        'standing in snow-covered landscape',
        'basking in golden sunset light',
        'under starry night sky', 'during thunderstorm',
        // 特定位置
        'hiding in tall grass', 'on tree branch',
        'in hollow log', 'under leafy canopy',
        'near colorful flowers', 'among autumn leaves',
        'on sandy beach', 'in desert oasis with palm trees'
      ],
      // 详细动作描述
      action: [
        // 姿态动作
        'standing alert with ears perked up',
        'sitting gracefully with tail wrapped around',
        'lying down resting head on paws',
        'crouching ready to pounce',
        'stretching body fully extended',
        'walking slowly and carefully',
        'running at full speed with motion blur',
        'jumping through the air',
        'climbing tree trunk with claws',
        'flying with wings spread wide',
        'swimming underwater with bubbles',
        // 进食动作
        'eating grass peacefully',
        'drinking water with head down',
        'chewing on branch or bone',
        'catching fish in river',
        'hunting with intense focus',
        // 社交动作
        'mother nursing babies',
        'playing with siblings',
        'grooming another animal',
        'sleeping curled up together',
        'fighting with rival',
        // 特殊状态
        'sleeping peacefully with eyes closed',
        'howling at the moon',
        'looking directly at viewer',
        'looking back over shoulder',
        'roaring with mouth open',
        'shedding tears',
        'injured but determined',
        'young and clumsy learning to walk',
        'old and wise with gray fur'
      ],
      // 身体细节
      detail: [
        'fur texture clearly visible',
        'feathers individually detailed',
        'scales shimmering',
        'skin wrinkled and realistic',
        'mane flowing in wind',
        'tail bushy and curled',
        'wings translucent',
        'horns or antlers prominent',
        'spikes or quills visible',
        'patterns and markings natural',
        'eyes bright and expressive',
        'wet nose texture',
        'paws with pads detailed',
        'claws sharp and visible'
      ]
    },
    patterns: [
      "{root} {action}",
      "{root} in {environment}",
      "{root} {action} in {environment}",
      "{detail} {root}",
      "portrait of {root} {action}",
      "{style} {root} with {detail}",
      "detailed {root} {environment}",
      "{root} family {action}"
    ]
  },

  plant: {
    dimensions: {
      variety: [
        // 热门花卉品种
        'red rose', 'white rose', 'pink rose', 'yellow rose', 'lavender rose',
        'sunflower', 'tulip', 'daisy', 'lily', 'orchid', 'lotus',
        'cherry blossom', 'peony', 'dahlia', 'marigold', 'poppy',
        'jasmine', 'lavender', 'iris', 'violet', 'bluebonnet',
        'magnolia', 'camellia', 'gardenia', 'hibiscus', 'bouganvillea',
        // 树木品种
        'oak tree', 'pine tree', 'palm tree', 'willow tree', 'bonsai tree',
        'cherry tree', 'apple tree', 'bamboo', 'cactus', 'succulent'
      ],
      style: [
        'cute', 'simple', 'easy',
        'botanical illustration', 'scientific', 'realistic',
        'vintage', 'art nouveau', 'therapeutic', 'mandala style', 'geometric'
      ],
      // 详细场景
      scene: [
        // 生长环境
        'growing from cracked stone pavement',
        'in cottage garden with picket fence',
        'in wild meadow with tall grass',
        'in greenhouse with glass panels visible',
        'on windowsill with curtains',
        'in terracotta pot on wooden table',
        'hanging from basket on porch',
        'climbing up brick wall',
        'in bamboo container',
        'among mossy rocks in stream',
        // 特定情境
        'with morning dewdrops on petals',
        'covered in fresh snow',
        'bathed in golden hour light',
        'with dramatic shadows from above',
        'reflected in still pond water',
        'backlit by bright sunlight',
        'in moonlight with stars',
        'during autumn with falling leaves',
        'surrounded by autumn foliage',
        'with spring buds just opening',
        // 艺术呈现
        'in vintage mason jar',
        'wrapped in brown paper and twine',
        'arranged in vintage vase',
        'in floral bouquet with ribbon',
        'as single stem in glass bottle',
        'dried and hanging upside down',
        'pressed in vintage book',
        'woven into flower crown'
      ],
      // 生长状态动作
      action: [
        'just beginning to sprout from soil',
        'tightly closed bud ready to open',
        'partially opening showing layers',
        'fully bloomed with petals wide',
        'petals falling gently one by one',
        'wilted but still beautiful',
        'dried seed head with seeds scattering',
        'leaning towards light source',
        'swaying gently in breeze',
        'bent under weight of rain',
        'growing vines wrapping around',
        'roots showing in soil',
        'leaves turning yellow and brown',
        'new growth emerging from stem'
      ],
      // 配套元素
      companion: [
        'with honeybee collecting nectar',
        'with butterfly resting on petal',
        'with fuzzy caterpillar eating leaf',
        'with small ladybug on leaf',
        'with dragonfly nearby',
        'with bird perched on branch',
        'with spider web between leaves',
        'with snail on stem',
        'with dewdrop on each petal tip',
        'with raindrops clinging to petals'
      ]
    },
    patterns: [
      "{root} {action}",
      "{root} in {scene}",
      "botanical {root} illustration",
      "{style} {root} {action}",
      "{root} {companion}",
      "detailed {root} {scene}",
      "{root} blooming in {scene}"
    ]
  },

  object: {
    dimensions: {
      variant: [
        // 热门物品变体
        'teddy bear', 'rag doll', 'wooden toy', 'plastic toy', 'stuffed animal',
        'rubber ball', 'bouncing ball', 'soccer ball', 'basketball', 'baseball',
        'coloring book', 'story book', 'picture book', 'notebook', 'sketchbook',
        'colored pencil', 'crayon', 'marker', 'paintbrush', 'watercolor set',
        'wooden chair', 'rocking chair', 'armchair', 'bean bag', 'stool',
        'toy car', 'toy train', 'toy airplane', 'building blocks', 'puzzle pieces',
        'music box', 'kite', 'bubble wand', 'jump rope', 'hula hoop'
      ],
      style: [
        // 儿童风格
        'cute', 'cartoon', 'simple', 'easy', 'kawaii',
        // 写实风格
        'realistic', 'detailed', 'accurate', 'precise',
        // 艺术风格
        'vintage', 'retro', 'modern', 'minimalist', 'aesthetic',
        'therapeutic', 'mandala style', 'geometric', 'folk art',
        'illustration', 'watercolor style', 'sketch'
      ],
      scene: [
        // 位置场景
        'on table', 'on shelf', 'in room', 'in classroom', 'in office',
        'outdoors', 'in park', 'at home', 'in store', 'in window display',
        // 使用场景
        'in use', 'being held', 'on display', 'arranged', 'scattered',
        'with other objects', 'alone', 'in collection', 'in setting'
      ],
      action: [
        'sitting', 'standing', 'lying', 'hanging', 'floating',
        'being used', 'on display', 'in motion', 'stationary',
        'glowing', 'shining', 'reflecting'
      ],
      detail: [
        'with details', 'close up', 'in context', 'with background',
        'with shadows', 'with reflections', 'showing texture',
        'side view', 'front view', 'angle view'
      ],
      companion: [
        'with other objects', 'with hands', 'with person', 'in setting',
        'with decorations', 'with accessories', 'with packaging'
      ]
    },
    patterns: [
      "{style} {variant}",
      "{variant} {scene}",
      "{variant} {action} {scene}",
      "detailed {root} {detail}",
      "{style} {root} with {companion}",
      "therapeutic {root} mandala",
      "realistic {variant} illustration",
      "{style} {variant} in {scene}"
    ]
  },

  fantasy: {
    dimensions: {
      character: [
        // 热门奇幻角色
        'unicorn', 'pegasus', 'fairy', 'pixie', 'elf',
        'dragon', 'baby dragon', 'fire dragon', 'ice dragon', 'sea dragon',
        'mermaid', 'merman', 'siren', 'sea nymph',
        'wizard', 'witch', 'sorcerer', 'enchantress', 'magician',
        'knight', 'paladin', 'warrior', 'samurai', 'viking',
        'princess', 'prince', 'king', 'queen', 'royal guard',
        'giant', 'dwarf', 'gnome', 'goblin', 'troll',
        'phoenix', 'griffin', 'centaur', 'minotaur',
        'ghost', 'spirit', 'angel', 'cherub', 'cupid'
      ],
      style: [
        'cute', 'simple', 'easy',
        'realistic', 'detailed', 'epic', 'mythical',
        'therapeutic', 'mandala style', 'geometric', 'folk art'
      ],
      // 详细奇幻场景
      scene: [
        // 魔法森林场景
        'in ancient forest with bioluminescent plants',
        'in crystal cave with glowing formations',
        'in enchanted grove with floating lights',
        'in mystical forest with magical creatures',
        'in dark forest with fireflies',
        // 城堡场景
        'in grand castle hall with chandeliers',
        'on castle tower overlooking kingdom',
        'in castle dungeon with stone walls',
        'in royal throne room',
        'in castle garden with magical fountains',
        // 天空场景
        'soaring through star-filled night sky',
        'floating above clouds at sunset',
        'flying through aurora borealis',
        'resting on crescent moon',
        'playing among constellations',
        // 魔法场景
        'standing in circle of magical runes',
        'at ancient altar with candles',
        'in library with floating books',
        'in potion room with bubbling cauldrons',
        'in magical workshop with crystals',
        // 特殊环境
        'emerging from misty lake',
        'standing on floating island',
        'in underground labyrinth',
        'at dragon\'s treasure hoard',
        'in celestial palace'
      ],
      // 详细动作
      action: [
        // 魔法动作
        'casting spell with hands glowing',
        'summoning magical energy from surroundings',
        'reading ancient glowing spellbook',
        'brewing potion in cauldron',
        'wielding magical staff with light',
        'creating portal with swirling magic',
        'healing wounded creature',
        'teleporting with fading form',
        // 战斗动作
        'sword fighting with magic enhanced blade',
        'defending with magical shield',
        'shooting energy blast from hands',
        'dodging enemy attack mid-air',
        'riding dragon into battle',
        'commanding army of creatures',
        // 日常动作
        'sleeping on bed of clouds',
        'eating magical feast at table',
        'playing with magical creatures',
        'practicing sword fighting alone',
        'meditating in lotus position floating',
        'looking in magic mirror',
        'writing in ancient tome'
      ],
      companion: [
        'with tiny fairy on shoulder',
        'with baby dragon following',
        'with magical phoenix companion',
        'with wise old wizard',
        'with spirit animal guide',
        'with elemental creature',
        'with enchanted weapon floating nearby',
        'with mythical beast companion'
      ]
    },
    patterns: [
      "{root}",
      "{style} {character}",
      "{character} {action}",
      "{character} in {scene}",
      "{style} {character} {action}",
      "fantasy {character} {companion}",
      "detailed {character} in {scene}",
      "{character} casting magic in {scene}",
      "epic {character} {action}"
    ]
  },

  holiday: {
    dimensions: {
      element: [
        // 热门节日元素
        // Christmas
        'christmas tree', 'santa claus', 'reindeer', 'snowman', 'candy cane',
        'christmas stocking', 'ornament', 'gingerbread man', 'mistletoe', 'poinsettia',
        'christmas wreath', 'bell', 'angel', 'star', 'present', 'gift box',
        // Easter
        'easter egg', 'easter bunny', 'chick', 'butterfly', 'flower basket',
        // Halloween
        'jack o lantern', 'pumpkin', 'bat', 'spider', 'skeleton',
        'witch hat', 'ghost', 'black cat', 'candy corn',
        // Thanksgiving
        'turkey', 'cornucopia', 'autumn leaves', 'pilgrim', 'mayflower',
        // Valentine
        'heart', 'cupid', 'arrow', 'rose', 'love letter',
        // Other
        'firework', 'flag', 'balloon', 'confetti', 'party hat'
      ],
      style: [
        // 儿童风格
        'cute', 'cartoon', 'kawaii', 'simple', 'easy',
        // 传统/艺术风格
        'vintage', 'victorian', 'retro', 'nostalgic', 'classic',
        'folk art', 'traditional', 'rustic',
        // 现代风格
        'modern', 'minimalist', 'elegant', 'sophisticated', 'aesthetic',
        // 艺术/成人风格
        'intricate', 'detailed', 'therapeutic', 'mandala style',
        'art nouveau', 'watercolor style', 'geometric'
      ],
      scene: [
        // 室内场景
        'by fireplace', 'under tree', 'on mantelpiece', 'in cozy room',
        'in kitchen', 'on porch', 'in window', 'on table',
        // 室外场景
        'in snowy setting', 'in festive street', 'in decorated space',
        'at celebration', 'at gathering', 'at party',
        // 活动场景
        'celebrating', 'decorating', 'opening gifts', 'together',
        'sharing joy', 'in tradition'
      ],
      action: [
        'celebrating', 'decorating', 'sharing', 'giving', 'singing',
        'dancing', 'gathering', 'remembering', 'honoring tradition'
      ],
      decoration: [
        'with lights', 'with ornaments', 'with ribbons', 'with bows',
        'with symbols', 'with traditional elements', 'with festive items'
      ],
      mood: [
        'joyful and bright', 'cozy and warm', 'peaceful and serene',
        'festive and cheerful', 'elegant and refined', 'traditional',
        'magical and enchanting', 'heartwarming'
      ]
    },
    patterns: [
      "{element} {scene}",
      "{style} {element} {scene}",
      "vintage {element} illustration",
      "therapeutic {root} mandala",
      "{mood} {element}",
      "traditional {element} {decoration}"
    ]
  },

  vehicle: {
    dimensions: {
      type: [
        // 热门交通工具
        'sports car', 'sedan', 'suv', 'truck', 'pickup truck',
        'school bus', 'city bus', 'double decker bus',
        'steam train', 'electric train', 'high speed train', 'subway train',
        'passenger airplane', 'jet plane', 'propeller plane', 'helicopter',
        'sailboat', 'speedboat', 'yacht', 'cruise ship', 'pirate ship',
        'bicycle', 'mountain bike', 'scooter', 'skateboard', 'roller skates',
        'rocket', 'spaceship', 'ufo', 'hot air balloon',
        'fire truck', 'police car', 'ambulance', 'tractor', 'crane'
      ],
      style: [
        // 儿童风格
        'cute', 'cartoon', 'simple', 'easy',
        // 写实风格
        'realistic', 'detailed', 'technical', 'accurate', 'precise',
        // 艺术风格
        'vintage', 'retro', 'futuristic', 'sleek', 'aesthetic',
        'therapeutic', 'mandala style', 'geometric', 'minimalist'
      ],
      environment: [
        'on road', 'on highway', 'in city', 'in countryside',
        'at station', 'at airport', 'at port', 'in garage',
        'in action', 'parked', 'racing', 'cruising'
      ],
      action: [
        'moving', 'parked', 'racing', 'speeding', 'cruising',
        'loading', 'unloading', 'taking off', 'landing', 'sailing'
      ],
      detail: [
        'side view', 'front view', 'rear view', 'interior detailed',
        'engine detailed', 'with passengers', 'with cargo', 'close up'
      ]
    },
    patterns: [
      "{type} {action} {environment}",
      "technical {type} illustration",
      "detailed {type} {detail}",
      "{style} {type} in {environment}"
    ]
  },

  character: {
    dimensions: {
      role: [
        // 热门角色
        'princess', 'prince', 'king', 'queen', 'knight',
        'superhero', 'superheroine', 'villain', 'sidekick',
        'doctor', 'nurse', 'vet', 'dentist', 'surgeon',
        'teacher', 'student', 'scientist', 'artist', 'musician',
        'chef', 'baker', 'waiter', 'farmer', 'gardener',
        'police officer', 'firefighter', 'soldier', 'pilot', 'astronaut',
        'pirate', 'ninja', 'cowboy', 'wizard', 'witch',
        'ballerina', 'soccer player', 'basketball player', 'swimmer', 'gymnast',
        'detective', 'spy', 'explorer', 'archeologist', 'inventor'
      ],
      style: [
        // 儿童风格
        'cute', 'cartoon', 'chibi', 'simple', 'easy',
        // 写实风格
        'realistic', 'detailed', 'portrait', 'lifelike',
        // 艺术风格
        'anime', 'manga', 'comic', 'illustration', 'artistic',
        'vintage', 'elegant', 'sophisticated', 'aesthetic',
        'therapeutic', 'mandala style', 'folk art'
      ],
      scene: [
        'at work', 'in action', 'at home', 'outdoors', 'in studio',
        'in setting', 'with background', 'in environment',
        'portrait style', 'full body', 'in costume', 'in uniform'
      ],
      action: [
        'working', 'playing', 'studying', 'creating', 'exploring',
        'helping', 'teaching', 'performing', 'practicing', 'relaxing'
      ],
      detail: [
        'with tools', 'with accessories', 'in action pose', 'standing',
        'sitting', 'with expression', 'showing emotion', 'in detail'
      ]
    },
    patterns: [
      "{role} {action} {scene}",
      "portrait of {role}",
      "detailed {role} {detail}",
      "{style} {role} in {scene}"
    ]
  },

  food: {
    dimensions: {
      item: [
        // 热门食物
        // 水果
        'apple', 'banana', 'orange', 'strawberry', 'grape',
        'watermelon', 'pineapple', 'mango', 'peach', 'cherry',
        'lemon', 'kiwi', 'pear', 'plum', 'blueberry', 'raspberry',
        // 甜点
        'cake', 'birthday cake', 'cupcake', 'cookie', 'chocolate chip cookie',
        'ice cream', 'ice cream cone', 'donut', 'muffin', 'brownie',
        'candy', 'lollipop', 'candy cane', 'chocolate bar',
        // 主食
        'pizza', 'hamburger', 'cheeseburger', 'hot dog', 'sandwich',
        'burger', 'taco', 'burrito', 'spaghetti', 'mac and cheese',
        // 其他
        'cupcake', 'pancake', 'waffle', 'french fries', 'chips',
        'popcorn', 'pretzel', 'croissant', 'bagel', 'toast'
      ],
      style: [
        // 儿童风格
        'cute', 'cartoon', 'kawaii', 'simple', 'easy',
        // 写实风格
        'realistic', 'detailed', 'appetizing', 'photorealistic',
        // 艺术风格
        'vintage', 'retro', 'folk art', 'whimsical', 'aesthetic',
        'therapeutic', 'mandala style', 'geometric', 'minimalist',
        'watercolor style', 'illustration'
      ],
      scene: [
        'on plate', 'in bowl', 'on table', 'at picnic', 'in kitchen',
        'at party', 'in basket', 'in box', 'on serving dish',
        'with ingredients', 'being prepared', 'ready to eat'
      ],
      presentation: [
        'whole', 'cut in half', 'sliced', 'arranged', 'stacked',
        'with garnish', 'decorated', 'plated beautifully'
      ],
      companion: [
        'with other food', 'with drinks', 'with utensils', 'with napkin',
        'with tablecloth', 'with decorations'
      ]
    },
    patterns: [
      "{item} {presentation}",
      "{style} {item} {scene}",
      "appetizing {item} illustration",
      "cute {item} {companion}",
      "therapeutic {root} mandala"
    ]
  },

  nature: {
    dimensions: {
      phenomenon: [
        // 热门自然现象
        'sun', 'rising sun', 'setting sun', 'solar eclipse',
        'moon', 'full moon', 'crescent moon', 'harvest moon', 'lunar eclipse',
        'star', 'shooting star', 'north star', 'constellation', 'milky way',
        'cloud', 'cumulus cloud', 'rain cloud', 'storm cloud',
        'rain', 'heavy rain', 'light rain', 'rainbow', 'double rainbow',
        'snow', 'snowflake', 'blizzard', 'hail', 'sleet',
        'lightning', 'thunder', 'tornado', 'hurricane', 'typhoon',
        'wind', 'breeze', 'tornado', 'whirlwind',
        'aurora', 'aurora borealis', 'meteor shower', 'comet',
        'ocean wave', 'tsunami', 'tidal wave', 'fog', 'mist'
      ],
      style: [
        // 儿童风格
        'cute', 'simple', 'easy', 'cartoon',
        // 艺术/专业风格
        'realistic', 'detailed', 'scientific', 'accurate',
        'artistic', 'landscape', 'scenic', 'atmospheric',
        'therapeutic', 'mandala style', 'geometric', 'minimalist',
        'watercolor', 'impressionist', 'abstract'
      ],
      scene: [
        'in landscape', 'with horizon', 'in sky', 'over mountains',
        'reflecting in water', 'through clouds', 'at different times',
        'in different weather', 'in seasons', 'with environment'
      ],
      condition: [
        'rising', 'setting', 'shining bright', 'dimly lit',
        'stormy', 'calm', 'dramatic', 'peaceful', 'vibrant'
      ],
      companion: [
        'with clouds', 'with stars', 'with landscape', 'with trees',
        'with buildings', 'with animals', 'with people'
      ]
    },
    patterns: [
      "{phenomenon} {condition} {scene}",
      "landscape {phenomenon}",
      "atmospheric {root} {scene}",
      "therapeutic {root} mandala"
    ]
  },

  place: {
    dimensions: {
      location: [
        // 热门地点
        // 住宅类
        'house', 'cottage', 'cabin', 'mansion', 'castle', 'palace',
        'treehouse', 'igloo', 'lighthouse', 'windmill',
        // 建筑
        'tower', 'bridge', 'golden gate bridge', 'tower bridge',
        'fountain', 'monument', 'statue', 'obelisk',
        // 场所
        'park', 'garden', 'playground', 'school', 'library',
        'hospital', 'museum', 'church', 'temple', 'mosque',
        'farm', 'barn', 'silo', 'greenhouse',
        // 特殊地点
        'beach', 'forest', 'mountain', 'volcano', 'canyon',
        'waterfall', 'cave', 'desert', 'oasis', 'island',
        'city', 'town', 'village', 'street', 'market'
      ],
      style: [
        // 儿童风格
        'cute', 'simple', 'easy', 'cartoon',
        // 建筑/艺术风格
        'architectural', 'detailed', 'realistic', 'accurate',
        'vintage', 'historical', 'modern', 'futuristic',
        'aesthetic', 'therapeutic', 'mandala style', 'folk art',
        'illustration', 'watercolor style'
      ],
      scene: [
        'exterior view', 'interior view', 'aerial view', 'street view',
        'in setting', 'with surroundings', 'in context',
        'daytime', 'nighttime', 'in different seasons',
        'with people', 'empty', 'in use'
      ],
      detail: [
        'with architectural details', 'showing facade', 'with decoration',
        'in style period', 'with landscape', 'with urban context',
        'with interior design', 'with furnishings'
      ],
      atmosphere: [
        'peaceful', 'bustling', 'historical', 'modern', 'magical',
        'cozy', 'grand', 'simple', 'ornate'
      ]
    },
    patterns: [
      "{root}",
      "{style} {location}",
      "{style} {root}",
      "{location} {scene}",
      "architectural {location} {detail}",
      "{atmosphere} {location}",
      "detailed {location} illustration",
      "therapeutic {root} mandala"
    ]
  },

  ip: {
    dimensions: {
      character: [
        // IP 系列中的其他角色
        // Hello Kitty 系列
        'mimmy', 'daniel', 'mama', 'papa', 'grandpa', 'grandma',
        'my melody', 'kuromi', 'cinnamoroll', 'pompompurin',
        // 小猪佩奇系列
        'george pig', 'mummy pig', 'daddy pig', 'suzy sheep', 'rebecca rabbit',
        'danny dog', 'candy cat', 'pedro pony', 'emily elephant', 'edmond elephant',
        // 超级英雄系列
        'mary jane', 'aunt may', 'gwen stacy', 'joker', 'lex luthor',
        'lois lane', 'jimmy olsen', 'pepper potts', 'happy hogan',
        // 迪士尼公主
        'prince charming', 'prince philip', 'prince naveen', 'flynn rider',
        'beast', 'aladdin', 'hercules', 'john smith', 'li shang',
        // Pokemon
        'ash', 'pikachu', 'misty', 'brock', 'team rocket', 'jessie', 'james',
        'eevee', 'charizard', 'mewtwo', 'snorlax', 'gengar',
        // 变形金刚/汪汪队
        'ryder', 'chase', 'marshall', 'rubble', 'skye', 'rocky', 'zuma', 'everest',
        // 其他
        'minnie mouse', 'donald duck', 'goofy', 'pluto', 'daisy duck',
        'tigger', 'piglet', 'eeyore', 'rabbit', 'roo', 'lumpy',
        'patrick', 'squidward', 'sandy', 'mr krabs', 'plankton'
      ],
      location: [
        // IP 特有的地点场景
        // Hello Kitty
        'hello kitty house', 'london big ben', 'sanrio puroland', 'hello kitty bakery',
        // 小猪佩奇
        'peppa house', 'playground', 'school', 'grandpa pig garden', 'muddy puddle',
        'summer camp', 'the beach', 'snowy mountain', 'miss rabbit zoo',
        // 超级英雄
        'gotham city', 'metropolis', 'avengers tower', 'stark industries',
        'daily bugle', 'wayne manor', 'batcave', 'kent farm', 'daily planet',
        // 迪士尼
        'disney castle', 'enchanted forest', 'under the sea', 'princess castle',
        'pride rock', 'neverland', 'wonderland',
        // Pokemon
        'pallet town', 'pewter city', 'cerulean city', 'viridian forest',
        'pokemon gym', 'professor oak lab', 'team rocket hideout',
        // 海绵宝宝
        'bikini bottom', 'jellyfish fields', 'krusty krab', 'chum bucket',
        'rock bottom', 'goo lagoon',
        // 其他
        'hundred acre wood', 'mystery shack', 'gravity falls'
      ],
      item: [
        // IP 特有的道具物品
        // Hello Kitty
        'red bow', 'apple', 'cookie', 'ribbon', 'oven', 'tea set', 'tricycle',
        // 小猪佩奇
        'teddy bear', 'goldie fish', 'muddy boots', 'rainboots', 'umbrella',
        'golden boots', 'crown', 'birthday cake',
        // 超级英雄
        'web shooter', 'batarang', 'kryptonite', 'captain shield', 'mjolnir',
        'iron man armor', 'infinity stones', 'batmobile', 'bat signal',
        // 迪士尼
        'magic wand', 'glass slipper', 'rose', 'magic lamp', 'flying carpet',
        'pooh honey pot', 'tigger tail', 'eeyore ribbon',
        // Pokemon
        'pokeball', 'pokedex', 'pokemon egg', 'tm badge', 'pokemon berry',
        'team rocket meowth balloon',
        // 海绵宝宝
        'spatula', 'krabby patty', 'jellyfish net', 'shell phone', 'gary shell',
        // 其他
        'mickey ears', 'donald sailor hat', 'goofy hat'
      ],
      theme: [
        // IP 特有的主题/剧集场景
        // Hello Kitty
        'hello kitty baking cookies', 'hello kitty tea party', 'hello kitty picnic',
        'hello kitty birthday party', 'hello kitty christmas', 'hello kitty in school',
        // 小猪佩奇
        'peppa jumping in muddy puddles', 'peppa family trip', 'peppa playdate',
        'peppa camping adventure', 'peppa christmas special', 'peppa at school',
        // 超级英雄
        'spider-man swinging through city', 'batman patrolling gotham',
        'superman flying', 'avengers assembling', 'justice league gathering',
        // 迪士尼
        'elsa letting it go', 'ariel singing underwater', 'cinderella ball',
        'snow white with seven dwarfs', 'moana sailing ocean', 'mulan training',
        // Pokemon
        'ash catching pokemon', 'pokemon battle', 'pokemon evolution',
        'team rocket blasting off', 'pokemon contest',
        // 海绵宝宝
        'spongebob flipping krabby patties', 'jellyfishing with patrick',
        'boating school', 'krusty krab cooking', 'bikini bottom adventure'
      ]
    },
    patterns: [
      "{root} with {character}",
      "{root} at {location}",
      "{root} with {item}",
      "{theme}",
      "{root} {item} at {location}",
      "kawaii {root} with {item}",
      "{root} birthday party with {character}",
      "detailed {root} at {location}",
      "therapeutic {root} with {character}"
    ]
  },

  general: {
    dimensions: {
      variant: [
        // 通用热门变体
        'classic', 'modern', 'vintage', 'retro', 'contemporary',
        'traditional', 'rustic', 'elegant', 'simple', 'detailed',
        'colorful', 'monochrome', 'pastel', 'vibrant', 'muted',
        'small', 'medium', 'large', 'mini', 'giant',
        'cute', 'beautiful', 'lovely', 'charming', 'delightful'
      ],
      style: [
        'cute', 'simple', 'easy', 'cartoon',
        'realistic', 'detailed', 'intricate', 'aesthetic',
        'vintage', 'therapeutic', 'mandala style', 'folk art'
      ],
      scene: [
        'alone', 'with background', 'in setting',
        'in context', 'displayed', 'arranged'
      ],
      detail: [
        'simple outline', 'detailed', 'with shading', 'minimalist'
      ]
    },
    patterns: [
      "{variant} {scene}",
      "detailed {root}",
      "therapeutic {root} mandala"
    ]
  },
};

/**
 * IP 系列配置 - 按 IP 分组的维度值
 * 确保生成的关键词与 IP 系列匹配
 */
const IP_SERIES_CONFIGS: Record<string, Partial<DimensionConfig>> = {
  // Hello Kitty 系列
  sanrio: {
    dimensions: {
      character: [
        'mimmy', 'daniel', 'mama', 'papa', 'grandpa', 'grandma',
        'my melody', 'kuromi', 'cinnamoroll', 'pompompurin',
        'kerokerokeroppi', 'bad badtz-maru', 'little twin stars'
      ],
      location: [
        'hello kitty house', 'london big ben', 'sanrio puroland',
        'hello kitty bakery', 'tea party garden', 'sanrio store'
      ],
      item: [
        'red bow', 'apple', 'cookie', 'ribbon', 'oven', 'tea set',
        'tricycle', 'teddy bear', 'flower basket', 'birthday cake'
      ],
      theme: [
        'hello kitty baking cookies', 'hello kitty tea party',
        'hello kitty picnic', 'hello kitty birthday party',
        'hello kitty christmas', 'hello kitty in school'
      ]
    }
  },
  // 小猪佩奇系列
  peppa: {
    dimensions: {
      character: [
        'george pig', 'mummy pig', 'daddy pig', 'suzy sheep',
        'rebecca rabbit', 'danny dog', 'candy cat', 'pedro pony',
        'emily elephant', 'edmond elephant', 'richard rabbit', 'freddy fox'
      ],
      location: [
        'peppa house', 'playground', 'school', 'grandpa pig garden',
        'muddy puddle', 'summer camp', 'the beach', 'snowy mountain', 'miss rabbit zoo'
      ],
      item: [
        'teddy bear', 'goldie fish', 'muddy boots', 'rainboots', 'umbrella',
        'golden boots', 'crown', 'birthday cake'
      ],
      theme: [
        'peppa jumping in muddy puddles', 'peppa family trip',
        'peppa playdate', 'peppa camping adventure', 'peppa christmas special', 'peppa at school'
      ]
    }
  },
  // 汪汪队系列
  paw_patrol: {
    dimensions: {
      character: [
        'ryder', 'chase', 'marshall', 'rubble', 'skye', 'rocky', 'zuma', 'everest'
      ],
      location: [
        'lookout tower', 'adventure bay', 'katie pet parlour', 'farmer yard farm',
        'jake mountain', 'yumerias special beach', 'barkingburg castle'
      ],
      item: [
        'pup pack', 'pup tag', 'mission paw badge', 'sea patroller', 'air patroller'
      ],
      theme: [
        'paw patrol rescue mission', 'chase police patrol', 'marshall fire rescue',
        'sky air rescue', 'rubble construction', 'rocky recycling'
      ]
    }
  },
  // 超级英雄系列 (Marvel/DC)
  superhero: {
    dimensions: {
      character: [
        'iron man', 'captain america', 'thor', 'hulk', 'black widow', 'hawkeye',
        'spider-man', 'doctor strange', 'black panther', 'scarlet witch',
        'batman', 'superman', 'wonder woman', 'flash', 'aquaman', 'joker', 'lex luthor'
      ],
      location: [
        'avengers tower', 'stark industries', 'daily bugle', 'wayne manor',
        'batcave', 'metropolis', 'gotham city', 'daily planet', 'kent farm'
      ],
      item: [
        'web shooter', 'captain shield', 'mjolnir', 'iron man armor',
        'infinity stones', 'batarang', 'kryptonite', 'batmobile', 'bat signal'
      ],
      theme: [
        'spider-man swinging through city', 'batman patrolling gotham',
        'superman flying', 'avengers assembling', 'justice league gathering'
      ]
    }
  },
  // 迪士尼系列
  disney: {
    dimensions: {
      character: [
        'mickey mouse', 'minnie mouse', 'donald duck', 'goofy', 'pluto', 'daisy duck',
        'winnie the pooh', 'tigger', 'piglet', 'eeyore', 'rabbit', 'roo',
        'elsa', 'anna', 'olaf', 'moana', 'maui', 'ariel', 'belle', 'cinderella',
        'snow white', 'jasmine', 'aurora', 'rapunzel', 'tiana', 'mulan'
      ],
      location: [
        'disney castle', 'enchanted forest', 'under the sea', 'princess castle',
        'pride rock', 'neverland', 'wonderland', 'hundred acre wood', 'arendelle'
      ],
      item: [
        'magic wand', 'glass slipper', 'rose', 'magic lamp', 'flying carpet',
        'pooh honey pot', 'tigger tail', 'eeyore ribbon', 'crown'
      ],
      theme: [
        'elsa letting it go', 'ariel singing underwater', 'cinderella ball',
        'snow white with seven dwarfs', 'moana sailing ocean', 'mulan training'
      ]
    }
  },
  // Pokemon 系列
  pokemon: {
    dimensions: {
      character: [
        'ash', 'pikachu', 'misty', 'brock', 'team rocket', 'jessie', 'james',
        'eevee', 'charizard', 'mewtwo', 'snorlax', 'gengar', 'lucario', 'mew'
      ],
      location: [
        'pallet town', 'pewter city', 'cerulean city', 'viridian forest',
        'pokemon gym', 'professor oak lab', 'team rocket hideout'
      ],
      item: [
        'pokeball', 'pokedex', 'pokemon egg', 'tm badge', 'pokemon berry',
        'team rocket meowth balloon'
      ],
      theme: [
        'ash catching pokemon', 'pokemon battle', 'pokemon evolution',
        'team rocket blasting off', 'pokemon contest'
      ]
    }
  },
  // 海绵宝宝系列
  spongebob: {
    dimensions: {
      character: [
        'patrick', 'squidward', 'sandy', 'mr krabs', 'plankton', 'gary'
      ],
      location: [
        'bikini bottom', 'jellyfish fields', 'krusty krab', 'chum bucket',
        'rock bottom', 'goo lagoon'
      ],
      item: [
        'spatula', 'krabby patty', 'jellyfish net', 'shell phone', 'gary shell'
      ],
      theme: [
        'spongebob flipping krabby patties', 'jellyfishing with patrick',
        'boating school', 'krusty krab cooking', 'bikini bottom adventure'
      ]
    }
  }
};

/**
 * Root 到 IP 系列的映射
 */
const ROOT_TO_IP_SERIES: Record<string, string> = {
  // Sanrio
  'hello kitty': 'sanrio',
  'hellokitty': 'sanrio',
  'kuromi': 'sanrio',
  'my melody': 'sanrio',
  'cinnamoroll': 'sanrio',
  'pompompurin': 'sanrio',
  // 小猪佩奇
  'peppa pig': 'peppa',
  'peppapig': 'peppa',
  'george pig': 'peppa',
  // 汪汪队
  'paw patrol': 'paw_patrol',
  'pawpatrol': 'paw_patrol',
  'chase': 'paw_patrol',
  'marshall': 'paw_patrol',
  // 超级英雄 - Marvel
  'spider-man': 'superhero',
  'spiderman': 'superhero',
  'iron man': 'superhero',
  'captain america': 'superhero',
  'thor': 'superhero',
  'hulk': 'superhero',
  'black panther': 'superhero',
  'doctor strange': 'superhero',
  // 超级英雄 - DC
  'batman': 'superhero',
  'superman': 'superhero',
  'wonder woman': 'superhero',
  'flash': 'superhero',
  'aquaman': 'superhero',
  // 迪士尼
  'mickey mouse': 'disney',
  'minnie mouse': 'disney',
  'donald duck': 'disney',
  'winnie the pooh': 'disney',
  'elsa': 'disney',
  'anna': 'disney',
  'moana': 'disney',
  'ariel': 'disney',
  'cinderella': 'disney',
  'snow white': 'disney',
  'jasmine': 'disney',
  'rapunzel': 'disney',
  'mulan': 'disney',
  'belle': 'disney',
  'aurora': 'disney',
  'tiana': 'disney',
  // Pokemon
  'pokemon': 'pokemon',
  'pikachu': 'pokemon',
  'ash': 'pokemon',
  // 海绵宝宝
  'spongebob': 'spongebob',
  'sponge bob': 'spongebob',
  'patrick': 'spongebob'
};

/**
 * Generate AI-powered dimension config for a root
 *
 * This function uses type detection and smart templates to create
 * a complete DimensionConfig without requiring manual setup.
 *
 * @param root - The root keyword to generate config for
 * @returns AIConfigResult with complete config and metadata
 */
export function generateAIConfig(root: string): AIConfigResult {
  const rootType = detectRootType(root);
  let template = TYPE_TEMPLATES[rootType];

  // 特殊处理 IP 类型：根据 root 匹配对应的 IP 系列
  if (rootType === 'ip') {
    const lowerRoot = root.toLowerCase().trim();
    const ipSeries = ROOT_TO_IP_SERIES[lowerRoot];

    if (ipSeries && IP_SERIES_CONFIGS[ipSeries]) {
      // 找到匹配的 IP 系列配置，合并通用模板
      const ipConfig = IP_SERIES_CONFIGS[ipSeries];
      template = {
        ...template,
        dimensions: {
          ...template.dimensions,
          ...ipConfig.dimensions
        }
      };
    }
  }

  // Build the complete config
  const config: DimensionConfig = {
    root: root.toLowerCase().trim(),
    dimensions: {
      ...template.dimensions,
    },
    patterns: template.patterns || [],
  };

  // Calculate confidence based on type detection match
  const confidence = rootType === 'general' ? 0.5 : 0.8;

  return {
    config,
    rootType,
    confidence,
  };
}

/**
 * Generate config and optionally register it
 *
 * @param root - The root keyword
 * @param registerToRegistry - Optional registry to register the config
 * @returns The generated config
 */
export function generateAndRegisterConfig(
  root: string,
  registerToRegistry?: Record<string, DimensionConfig>
): DimensionConfig {
  const result = generateAIConfig(root);

  // Optionally register to a provided registry
  if (registerToRegistry) {
    const key = root.toLowerCase().trim();
    registerToRegistry[key] = result.config;
  }

  return result.config;
}
