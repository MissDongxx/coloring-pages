import type { DimensionConfig } from './types';

export const unicornConfig: DimensionConfig = {
    root: 'unicorn',
    dimensions: {
        // 角色变体 - 扩展更多类型
        character: [
            // 基础类型
            'baby unicorn', 'mother and baby unicorn',
            // 神话类型
            'pegasus', 'alicorn', 'night unicorn', 'crystal unicorn',
            // 风格化
            'princess unicorn', 'warrior unicorn', 'fairy unicorn',
            'royal unicorn with crown', 'unicorn with armor'
        ],
        // 风格 - 扩展成熟风格
        style: [
            // 儿童风格
            'cute', 'cartoon', 'kawaii', 'simple', 'easy',
            // 成人/艺术风格
            'realistic', 'intricate', 'elegant', 'detailed', 'aesthetic',
            'therapeutic', 'mandala style', 'geometric', 'folk art',
            'fantasy illustration', 'watercolor style', 'celtic art'
        ],
        // 场景 - 更丰富的情境
        scene: [
            // 自然环境
            'in enchanted forest', 'in crystal cave', 'at magical waterfall',
            'on mountain peak', 'in starry meadow', 'beside ancient ruins',
            // 天空场景
            'flying through clouds', 'galloping across sky', 'chasing stars',
            'under full moon', 'at sunset', 'in aurora borealis',
            // 魔法场景
            'with magical aura', 'surrounded by sparkles', 'near rainbow bridge',
            'at unicorn gathering', 'in dreamland', 'in fantasy castle',
            // 特定情境
            'drinking from stream', 'resting under tree', 'playing with butterflies',
            'guarding treasure', 'meeting fairy', 'with dragon companion'
        ],
        // 动作 - 新增维度
        action: [
            'galloping majestically', 'flying gracefully', 'rearing up',
            'bowing head', 'shaking mane', 'tossing head', 'prancing',
            'spreading wings', 'leaping', 'standing proudly',
            'sleeping peacefully', 'looking at viewer'
        ],
        // 配套元素
        companion: [
            'with fairy', 'with dragon', 'with phoenix', 'with butterflies',
            'with rainbow', 'with stars', 'with moon', 'with flowers',
            'with castle in background', 'with other unicorns', 'with forest animals'
        ],
        // 细节描述
        detail: [
            'showing flowing mane', 'with detailed horn', 'with feathered wings',
            'with floral wreath', 'with jeweled crown', 'with magical markings',
            'with armor details', 'with saddle and bridle'
        ]
    },
    patterns: [
        // 基础型
        "{root}",
        "{style} {root}",
        "{style} {character}",
        // 动作组合
        "{character} {action}",
        "{style} {character} {action}",
        "{character} {action} {scene}",
        // 场景组合
        "{character} in {scene}",
        "{style} {character} {scene}",
        "detailed {character} with {companion}",
        // 艺术/成人向
        "intricate {root} mandala",
        "therapeutic {character} {scene}",
        "fantasy illustration {character}",
        "celtic {root} design",
        // 特定情境
        "{character} {action} {companion}",
        "{detail} {character} coloring page",
        "{style} {character} at {scene}"
    ]
};
