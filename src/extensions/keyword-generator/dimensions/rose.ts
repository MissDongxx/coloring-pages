import type { DimensionConfig } from './types';

export const roseConfig: DimensionConfig = {
    root: 'rose',
    dimensions: {
        // 成人/成熟风格
        style: [
            // 基础风格
            'cute', 'simple', 'easy',
            // 艺术/专业风格
            'botanical illustration', 'art nouveau', 'vintage', 'realistic', 'intricate', 'elegant',
            'therapeutic', 'geometric', 'zentangle', 'folk art', 'watercolor style',
            // 特殊风格
            'mandala style', 'sketch', 'minimalist', 'aesthetic', 'detailed'
        ],
        // 扩展场景描述
        scene: [
            // 自然环境
            'in an english garden', 'on a trellis', 'climbing a stone wall', 'in a cottage garden',
            'in a wild meadow', 'beside a river', 'at sunrise', 'at sunset', 'in morning dew',
            // 特定情境
            'in a crystal vase', 'with morning dewdrops', 'petals drifting in wind', 'in full bloom',
            'as a tight bud', 'withering elegantly', 'with thorns detailed', 'with unfolding petals',
            // 装饰性场景
            'in a heart arrangement', 'in a wreath', 'in a bridal bouquet', 'in a vintage jar',
            'wrapped with ribbon', 'on a doily', 'in a teapot arrangement', 'in a watering can',
            // 季节场景
            'in spring rain', 'covered in snow', 'in autumn light', 'in summer sunshine',
            // 艺术场景
            'framed in vintage border', 'on decorative paper', 'with calligraphy flourishes'
        ],
        // 动作词
        action: [
            'blooming', 'wilting', 'budding', 'unfolding', 'dancing in wind',
            'reaching for sun', 'drifting', 'falling gently', 'swaying', 'twining',
            'opening at dawn', 'closing at dusk'
        ],
        // 配套元素
        companion: [
            'with a honeybee', 'with a butterfly', 'with a ladybug', 'with a dragonfly',
            'with a hummingbird', 'with a sparrow', 'with a caterpillar', 'with spider web',
            'with dewdrops', 'with raindrops', 'with baby bird', 'with nest'
        ],
        // 细节描述
        detail: [
            'with detailed petals', 'showing thorns', 'with leaves and stems', 'with multiple layers',
            'side view profile', 'top down view', 'from below looking up'
        ]
    },
    patterns: [
        // 基础型 - 适合主hub
        "{root}",
        "{style} {root}",
        "{style} {root} coloring page",
        // 动作+场景组合
        "{root} {action} {scene}",
        "{style} {root} {action}",
        "{root} {action} with {companion}",
        // 详细场景
        "{detail} {root} {scene}",
        "{style} {root} in {scene}",
        "intricate {root} with {companion}",
        // 艺术风格
        "botanical {root} illustration",
        "vintage {root} print",
        "therapeutic {root} mandala",
        // 季节性
        "{root} in spring",
        "{style} {root} at sunset"
    ]
};
