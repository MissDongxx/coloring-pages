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
      species: [],  // Will be AI-generated
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
      variety: [],  // Will be AI-generated
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
      "{root}",
      "{style} {root}",
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
      variant: [],  // Will be AI-generated
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
      character: [],  // Will be AI-generated
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
      element: [],  // Will be AI-generated
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
      type: [],  // Will be AI-generated
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
      role: [],  // Will be AI-generated
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
      item: [],  // Will be AI-generated
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
      phenomenon: [],  // Will be AI-generated
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
      location: [],  // Will be AI-generated
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

  general: {
    dimensions: {
      variant: [],  // Will be AI-generated
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
  const template = TYPE_TEMPLATES[rootType];

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
