/**
 * Pre-written examiner lines and speaking assets. Zero AI during the exam for examiner turns;
 * Part 2/3 use this data + Pollinations for images only.
 */

export const EXAMINER_FOLLOW_UPS_PART1: string[] = [
    "Thank you. What do you like to do in your free time?",
    "Interesting. How long have you been interested in that?",
    "I see. Do you prefer doing that alone or with others?",
    "Thank you. What is the best thing about it?",
    "And why is that important to you?",
    "How did you first get into that?",
    "Would you recommend it to others? Why?",
    "What do your friends think about it?",
    "Has that changed over the years?",
    "Is that popular in your country?",
    "What would you like to try in the future?",
    "How does that compare to other hobbies?",
    "Do you think you will still do that in the future?",
    "What advice would you give to someone starting out?",
    "Thank you. That's all for this part.",
];

export const EXAMINER_FOLLOW_UPS_PART2: string[] = [
    "Now please compare the second photo and say what the people might be feeling.",
    "Thank you. Now, which situation would you prefer to be in and why?",
    "You have one more minute. Please finish your comparison.",
    "Thank you. That's the end of Part 2.",
    "Now look at the second picture. How is it different from the first?",
];

export const EXAMINER_FOLLOW_UPS_PART3: string[] = [
    "What about another point on the mind map?",
    "Could you say more about that?",
    "How do you think that would work in practice?",
    "What do you think about the other ideas we have here?",
    "Which of these do you think is most important?",
    "Thank you. Let's consider the next point.",
];

export const EXAMINER_FOLLOW_UPS_PART4: string[] = [
    "Why do you think that is the case?",
    "How might that change in the future?",
    "What are the advantages and disadvantages?",
    "Can you give an example from your own experience?",
    "How does that affect people's daily lives?",
    "What is your personal view on that?",
    "Do you think everyone would agree?",
    "Thank you. That's the end of the speaking test.",
];

export interface Part2PhotoPair {
    prompt1: string;
    prompt2: string;
    question: string;
    topic: string;
}

export const PART2_PHOTO_PAIRS: Part2PhotoPair[] = [
    { topic: "Education", prompt1: "two students studying together in a library", prompt2: "a person studying alone at home on a laptop", question: "Compare these two photos and say how the people might be feeling. Which way of studying do you prefer?" },
    { topic: "Environment", prompt1: "people recycling at a community centre", prompt2: "a polluted beach with plastic waste", question: "Compare these two photos and say what they show about the environment. Which situation would you prefer to see more of?" },
    { topic: "Technology", prompt1: "a family using tablets together in a living room", prompt2: "a person using a smartphone alone on a bus", question: "Compare these two photos and say how technology is being used. How has technology changed the way we communicate?" },
    { topic: "Social Life", prompt1: "friends having a picnic in a park", prompt2: "people at a formal dinner party", question: "Compare these two photos and say what kind of social situations they show. Which would you prefer to be in?" },
    { topic: "Travel", prompt1: "tourists visiting a famous monument", prompt2: "a person hiking in the mountains alone", question: "Compare these two photos and say what kind of travel they show. Which type of holiday do you find more rewarding?" },
    { topic: "Hobbies", prompt1: "people playing a team sport", prompt2: "someone painting alone in a studio", question: "Compare these two photos and say what the people are doing. Do you prefer group or solo activities?" },
    { topic: "Work", prompt1: "an office with people in a meeting", prompt2: "a person working from home", question: "Compare these two photos and say what they show about work. What are the pros and cons of each?" },
    { topic: "Food", prompt1: "a street food market with many people", prompt2: "a quiet restaurant with one couple", question: "Compare these two photos and say what kind of eating experiences they show. Where would you rather eat?" },
    { topic: "Nature", prompt1: "children playing in a garden", prompt2: "a person meditating by a lake", question: "Compare these two photos and say how people are spending time in nature. Which do you find more relaxing?" },
    { topic: "Culture", prompt1: "a museum with visitors looking at art", prompt2: "a live music concert with a crowd", question: "Compare these two photos and say what cultural activities they show. Which do you enjoy more?" },
];

export interface Part3MindMap {
    centralQuestion: string;
    points: string[];
}

export const PART3_MIND_MAPS: Part3MindMap[] = [
    { centralQuestion: "What are some ways to protect the environment?", points: ["Recycling and reducing waste", "Using public transport", "Saving energy at home", "Supporting green products", "Planting trees"] },
    { centralQuestion: "What are the benefits of learning languages?", points: ["Better job opportunities", "Travel and communication", "Understanding other cultures", "Keeping the brain active", "Making new friends"] },
    { centralQuestion: "How can people spend school holidays usefully?", points: ["Part-time work", "Volunteering", "Learning a skill", "Travel with family", "Reading and rest"] },
    { centralQuestion: "How can we improve health in cities?", points: ["More parks and cycle lanes", "Cleaner air", "Sports facilities", "Healthy food options", "Less stress"] },
    { centralQuestion: "Why is it important to read books?", points: ["Improves vocabulary", "Reduces stress", "Increases knowledge", "Develops imagination", "Better concentration"] },
    { centralQuestion: "What makes a good friend?", points: ["Trust and honesty", "Being there in hard times", "Shared interests", "Good listener", "Respect"] },
    { centralQuestion: "How has technology changed education?", points: ["Online courses", "Interactive lessons", "Access to information", "Different learning pace", "Global classrooms"] },
    { centralQuestion: "What are the advantages of living in a small town?", points: ["Less traffic", "Strong community", "Safer for children", "Lower cost of living", "Closer to nature"] },
];

/** Get next examiner line for a part (by turn index). */
export function getExaminerFollowUp(part: 'PART1' | 'PART2' | 'PART3' | 'PART4', turnIndex: number): string {
    const lists = {
        PART1: EXAMINER_FOLLOW_UPS_PART1,
        PART2: EXAMINER_FOLLOW_UPS_PART2,
        PART3: EXAMINER_FOLLOW_UPS_PART3,
        PART4: EXAMINER_FOLLOW_UPS_PART4,
    };
    const list = lists[part];
    const index = turnIndex % list.length;
    return list[index];
}
