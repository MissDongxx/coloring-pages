import type { DimensionConfig } from './types';

export const roseConfig: DimensionConfig = {
    root: 'rose',
    dimensions: {
        character: [
            'tea rose',
            'wild rose',
            'climbing rose',
            'rosebud',
            'rose bush',
            'rose wreath',
            'rose bouquet',
            'single rose',
            'rose arch',
            'rose garden'
        ],
        style: [
            'cute',
            'realistic',
            'vintage',
            'simple',
            'easy',
            'detailed',
            'mandala style',
            'sketch',
            'art nouveau',
            'botanical illustration',
            'kawaii',
            'zentangle'
        ],
        scene: [
            'in a garden',
            'with a butterfly',
            'in a vase',
            'with raindrops',
            'on a fence',
            'with bees',
            'in a window box',
            'with thorns and leaves',
            'petals falling',
            'in full bloom',
            'growing on a wall',
            'in a heart shape',
            'in a teacup',
            'surrounded by vines',
            'with a ladybug',
            'on a cake',
            'with a bird',
            'in a basket'
        ],
        audience: [
            'for kids',
            'for toddlers',
            'for preschool',
            'for adults',
            'for teens'
        ]
    },
    patterns: [
        "{style} {root}",
        "{style} {character}",
        "{style} {root} {scene}",
        "{character} {scene} {audience}",
        "{style} {character} {scene}",
        "{style} {root} {audience}",
        "{character} {scene} for kids",
        "detailed {character} mandala",
        "{root} {scene} {audience}",
        "botanical {character} illustration"
    ]
};
