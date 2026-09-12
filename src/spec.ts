// Priority: 1 = critical (Headline, Image), 2 = important (Price, CTA), 3 = expendable (Logo)
export type Priority = 1 | 2 | 3;

export type ElementType = 'headline' | 'product-image' | 'price' | 'cta' | 'logo'; // this is used to define the type of element we have 

export interface ElementContent {
    text?: string; // we have question mark because every element may not have all the content fields
    imageUrl?: string;
    priceAmount?: string;
    currency?: string;
    badge?: string;
    ctaText?: string;
}

export interface AdElement {
    id: string; //unique identifier for the element
    type: ElementType; //this defines the type of element
    role: string;  // this defines the semantic purpose rather than just describing the role
    priority: Priority; //this helps in setting the priority ranking for the element(sets the preference which element is more important when there is no area available in the element)
    content: ElementContent; //the content can be seen by the user
    aspectRatio?: number; //the relation between the image size and the screensize(we have standard ratios)
}

export interface AdSpec { // this is the entire advertisement specification
    id: string;
    name: string;
    elements: AdElement[];
}

export const sampleAdSpec: AdSpec = { // this is the sample advertisement specification in which we define a sample advertisement 
    id: 'ad-sneaker-01',
    name: 'Ultra Flyknit Sneaker Launch',
    elements: [
        {
            id: 'elem-headline',
            type: 'headline',
            role: 'primary-heading',
            priority: 1,
            content: {
                text: 'Unleash Your Speed',
            },
        },
        {
            id: 'elem-image',
            type: 'product-image',
            role: 'visual',
            priority: 1,
            aspectRatio: 1.33,
            content: {
                imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop',
            },
        },
        {
            id: 'elem-price',
            type: 'price',
            role: 'transactional',
            priority: 2,
            content: {
                priceAmount: '129.99',
                currency: '$',
                badge: '20% OFF',
            },
        },
        {
            id: 'elem-cta',
            type: 'cta',
            role: 'transactional',
            priority: 2,
            content: {
                ctaText: 'Shop Now',
            },
        },
        {
            id: 'elem-logo',
            type: 'logo',
            role: 'branding',
            priority: 3,
            aspectRatio: 2.5,
            content: {
                text: 'FLAM SNEAKERS',
            },
        },
    ],
};
