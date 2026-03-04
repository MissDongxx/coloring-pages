import type { DimensionConfig } from './types';

export const unicornConfig: DimensionConfig = {
    root: 'unicorn',
    dimensions: {
        character: [
            'baby unicorn',
            'fly unicorn',
            'princess unicorn',
            'fairy unicorn',
            'alicorn',
            'pegasus'
        ],
        style: [
            'cute',
            'cartoon',
            'kawaii',
            'realistic',
            'simple',
            'easy',
            'detailed',
            'mandala style',
            'aesthetic'
        ],
        scene: [
            'with rainbow',
            'in clouds',
            'in enchanted forest',
            'with stars',
            'flying in sky',
            'sleeping on moon'
        ],
        audience: [
            'for kids',
            'for toddlers',
            'for girls',
            'for adults'
        ]
    },
    patterns: [
        "{style} {character} {scene}",
        "{style} {character} {audience}",
        "{character} {scene} {audience}",
        "detailed {character} {scene} {root}",
        "{style} {root} {audience}",
        "{root} {character} {scene}"
    ]
};
