import type { DimensionConfig } from './types';

export const christmasConfig: DimensionConfig = {
    root: 'christmas',
    dimensions: {
        character: [
            'santa claus',
            'reindeer',
            'rudolph',
            'elf',
            'snowman',
            'gingerbread man',
            'christmas tree',
            'angel',
            'penguin',
            'polar bear'
        ],
        style: [
            'cute',
            'cartoon',
            'kawaii',
            'realistic',
            'vintage',
            'simple',
            'easy',
            'detailed',
            'mandala style'
        ],
        scene: [
            'in snow',
            'decorating tree',
            'delivering gifts',
            'at north pole',
            'in fireplace',
            'opening presents',
            'building snowman'
        ],
        audience: [
            'for kids',
            'for toddlers',
            'for preschool',
            'for adults'
        ]
    },
    patterns: [
        "{style} {character} {scene} coloring page",
        "{style} {character} coloring page {audience}",
        "{character} {scene} coloring page for kids",
        "{style} {root} coloring page {audience}",
        "{root} {character} {scene} coloring pages",
        "detailed {character} mandala {root} coloring page" // High value combination
    ]
};
