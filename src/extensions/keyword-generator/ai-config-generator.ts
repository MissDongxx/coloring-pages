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
        // 儿童风格
        'cute', 'cartoon', 'kawaii', 'simple', 'easy', 'adorable',
        // 成人/艺术风格
        'realistic', 'detailed', 'intricate', 'elegant', 'aesthetic',
        'therapeutic', 'mandala style', 'geometric', 'folk art',
        'wildlife illustration', 'nature study', 'scientific illustration',
        'minimalist', 'zen', 'peaceful'
      ],
      environment: [
        'in natural habitat', 'in forest', 'in jungle', 'in meadow',
        'near water', 'on mountain', 'in desert', 'in arctic', 'in ocean',
        'in garden', 'in park', 'at zoo', 'on farm', 'in wild',
        'at sunrise', 'at sunset', 'under moonlight', 'in rain', 'in snow'
      ],
      action: [
        'standing', 'walking', 'running', 'jumping', 'flying', 'swimming',
        'sleeping', 'eating', 'playing', 'resting', 'looking at viewer',
        'with family', 'with babies', 'hunting', 'soaring', 'climbing'
      ],
      detail: [
        'with detailed fur', 'with feathers detailed', 'showing scales',
        'with patterns', 'with natural markings', 'in motion',
        'portrait style', 'full body', 'close up', 'in profile'
      ]
    },
    patterns: [
      "{root}",
      "{style} {root}",
      "{style} {root} {environment}",
      "{root} {action} {environment}",
      "{detail} {root} {action}",
      "wildlife {root} illustration",
      "therapeutic {root} mandala",
      "{style} {root} with family",
      "detailed {root} in habitat"
    ]
  },

  plant: {
    dimensions: {
      variety: [],  // Will be AI-generated
      style: [
        // 基础风格
        'cute', 'simple', 'easy', 'adorable',
        // 艺术/专业风格
        'botanical illustration', 'art nouveau', 'vintage', 'realistic',
        'intricate', 'elegant', 'therapeutic', 'geometric', 'zentangle',
        'folk art', 'watercolor style', 'scientific illustration',
        // 特殊风格
        'mandala style', 'sketch', 'minimalist', 'aesthetic', 'detailed'
      ],
      scene: [
        // 自然环境
        'in garden', 'in meadow', 'in forest', 'on mountain', 'in field',
        'beside river', 'near waterfall', 'at sunrise', 'at sunset',
        'in morning dew', 'in spring', 'in summer', 'in autumn', 'in winter',
        // 特定情境
        'in vase', 'in pot', 'in basket', 'in bouquet', 'in wreath',
        'growing wild', 'with buds', 'blooming', 'wilting', 'with leaves',
        'with roots', 'with thorns', 'with vines'
      ],
      action: [
        'blooming', 'budding', 'unfolding', 'swaying', 'reaching for sun',
        'dancing in wind', 'growing', 'flowering', 'wilting gently'
      ],
      companion: [
        'with butterfly', 'with bee', 'with ladybug', 'with bird',
        'with dewdrops', 'with raindrops', 'with other flowers',
        'with leaves', 'with vines', 'in grass'
      ]
    },
    patterns: [
      "{root}",
      "{style} {root}",
      "{style} {root} {scene}",
      "{root} {action} {scene}",
      "botanical {root} illustration",
      "vintage {root} print",
      "therapeutic {root} mandala",
      "{style} {root} with {companion}",
      "detailed {root} in {scene}"
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
      "{root}",
      "{style} {variant}",
      "{style} {root}",
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
        // 儿童风格
        'cute', 'cartoon', 'kawaii', 'simple', 'easy',
        // 成人/艺术风格
        'realistic', 'intricate', 'elegant', 'detailed', 'aesthetic',
        'therapeutic', 'mandala style', 'geometric', 'folk art',
        'fantasy illustration', 'epic style', 'mythical art',
        'celtic art', 'art nouveau', 'watercolor style'
      ],
      scene: [
        // 神奇环境
        'in enchanted forest', 'in magical realm', 'in fantasy castle',
        'in crystal cave', 'at ancient ruins', 'in mystical grove',
        'in dreamland', 'in otherworld', 'in shadow realm', 'in light realm',
        // 天空场景
        'flying through clouds', 'under stars', 'under moonlight',
        'at sunset', 'in aurora', 'in nebula', 'in cosmos',
        // 魔法场景
        'with magical aura', 'surrounded by magic', 'casting spell',
        'with glowing effect', 'with power emanating'
      ],
      action: [
        'casting spell', 'summoning power', 'flying majestically',
        'standing proudly', 'guarding treasure', 'on quest',
        'in battle', 'resting peacefully', 'looking mysterious',
        'emerging from shadows', 'ascending to heavens'
      ],
      companion: [
        'with fairy', 'with dragon', 'with phoenix', 'with unicorn',
        'with magical creatures', 'with spirits', 'with elements',
        'with ancient beings', 'with other fantasy creatures'
      ],
      detail: [
        'with glowing eyes', 'with magical markings', 'with armor',
        'with crown', 'with wings detailed', 'with elemental effects',
        'with ancient symbols', 'with mystical aura'
      ]
    },
    patterns: [
      "{style} {root}",
      "{style} {character}",
      "{character} {action} {scene}",
      "{style} {character} {scene}",
      "fantasy illustration {character}",
      "intricate {root} mandala",
      "mythical {character} with {companion}",
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
      "{root}",
      "{style} {element}",
      "{style} {root}",
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
      "{root}",
      "{style} {type}",
      "{style} {root}",
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
      "{root}",
      "{style} {role}",
      "{style} {root}",
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
      "{root}",
      "{style} {item}",
      "{style} {root}",
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
      "{root}",
      "{style} {phenomenon}",
      "{style} {root}",
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
      "{root}",
      "{style} {variant}",
      "{style} {root}",
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
