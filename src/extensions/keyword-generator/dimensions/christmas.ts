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
        "{style} {character} {scene}",
        "{style} {character} {audience}",
        "{character} {scene} {audience}",
        "{style} {root} {audience}",
        "{root} {character} {scene}",
        "detailed {character} mandala {root}"
    ]
};
