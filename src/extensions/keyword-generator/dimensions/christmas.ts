import type { DimensionConfig } from './types';

export const christmasConfig: DimensionConfig = {
    root: 'christmas',
    dimensions: {
        // 角色类型 - 扩展更多元素
        character: [
            // 传统角色
            'santa claus', 'mrs. claus', 'elf', 'reindeer', 'rudolph',
            'snowman', 'gingerbread man', 'angel', 'nutcracker',
            // 场景元素
            'christmas tree', 'wreath', 'poinsettia', 'holly', 'mistletoe',
            'stocking', 'present', 'bell', 'candle', 'lantern',
            // 动物
            'christmas penguin', 'polar bear', 'cardinal', 'dove', 'owl'
        ],
        // 风格 - 扩展成熟风格
        style: [
            // 儿童风格
            'cute', 'cartoon', 'kawaii', 'simple', 'easy',
            // 传统/艺术风格
            'vintage', 'victorian', 'retro', 'nostalgic', 'classic',
            'folk art', 'scandinavian', 'rustic', 'country',
            // 现代风格
            'modern', 'minimalist', 'elegant', 'sophisticated', 'aesthetic',
            // 艺术/成人风格
            'intricate', 'detailed', 'therapeutic', 'mandala style',
            'art nouveau', 'watercolor style', 'geometric'
        ],
        // 场景 - 更丰富的圣诞情境
        scene: [
            // 室内场景
            'by fireplace', 'under christmas tree', 'on mantelpiece', 'in cozy room',
            'in vintage kitchen', 'on front porch', 'in snowy window', 'on bedside table',
            'in grand hall', 'in cozy cabin', 'at dining table',
            // 室外场景
            'in snowy forest', 'at north pole', 'in christmas village', 'on city street',
            'in winter wonderland', 'at christmas market', 'on sleigh ride',
            'frozen pond', 'near lamppost', 'under northern lights',
            // 活动场景
            'decorating tree', 'wrapping presents', 'baking cookies', 'caroling',
            'building snowman', 'ice skating', 'opening presents', 'hanging stockings',
            'writing letters', 'reading christmas story'
        ],
        // 动作 - 新增维度
        action: [
            'delivering gifts', 'sleigh riding', 'hanging ornaments', 'lighting candles',
            'singing carols', 'wrapping gifts', 'baking', 'trimming tree',
            'dancing in snow', 'throwing snowballs', 'ice skating', 'making snowman',
            'hanging stockings', 'placing star on tree', 'ringing bells'
        ],
        // 装饰元素
        decoration: [
            'with lights', 'with tinsel', 'with ornaments', 'with ribbons',
            'with bows', 'with candy canes', 'with snowflakes', 'with stars',
            'with holly berries', 'with poinsettias', 'with garland'
        ],
        // 氛围/情感
        mood: [
            'cozy and warm', 'magical and glowing', 'peaceful and serene',
            'festive and cheerful', 'elegant and refined', 'whimsical and playful',
            'traditional and nostalgic', 'winter wonderland'
        ]
    },
    patterns: [
        // 基础型
        "{root}",
        "{style} {character}",
        "{style} {root} coloring page",
        // 动作组合
        "{character} {action}",
        "{character} {action} {scene}",
        "{style} {character} {action}",
        // 场景组合
        "{character} in {scene}",
        "{style} {character} {scene}",
        "cozy {character} by fireplace",
        // 装饰组合
        "{character} {decoration}",
        "{style} christmas tree {decoration}",
        "vintage wreath {decoration}",
        // 氛围组合
        "{mood} {character}",
        "{style} {mood} scene",
        // 艺术/成人向
        "intricate {character} {decoration}",
        "therapeutic christmas mandala",
        "victorian {character} illustration",
        "folk art {character}",
        "scandinavian minimal {character}",
        // 特定情境
        "santa {action} with reindeer",
        "{style} {character} at night",
        "detailed {character} in snow"
    ]
};
