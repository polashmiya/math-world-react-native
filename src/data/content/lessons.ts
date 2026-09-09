import { CURRENT_CONTENT_VERSION } from '../../domain/models/common';
import type { Lesson, LessonSection, LessonVisual } from '../../domain/models';

interface SectionSeed {
  kind: LessonSection['kind'];
  title: string;
  titleBn: string;
  body: string;
  bodyBn: string;
  expression?: string;
  visual?: LessonVisual;
}

interface LessonSeed {
  id: string;
  topicId: string;
  skillIds: string[];
  title: string;
  titleBn: string;
  summary: string;
  summaryBn: string;
  minutes: number;
  generators: string[];
  sections: SectionSeed[];
}

/**
 * Lessons follow the required flow: concept → visual → simple example →
 * worked example → practice → challenge → mastery test (spec §32). Bangla is
 * the primary explanation language; notation stays international.
 */
const SEEDS: LessonSeed[] = [
  {
    id: 'lesson.percentage-basics',
    topicId: 'percentage',
    skillIds: ['skill.percent-of', 'skill.percent-change'],
    title: 'Understanding Percentage',
    titleBn: 'শতকরা বোঝা',
    summary: 'Percent means "per hundred" — the single idea behind every percentage question.',
    summaryBn: 'শতকরা মানে "প্রতি একশোতে" — সব শতকরা প্রশ্নের মূল ধারণা এটাই।',
    minutes: 12,
    generators: ['pct.of-quantity', 'pct.change', 'pct.discount'],
    sections: [
      {
        kind: 'concept',
        title: 'Percent means per hundred',
        titleBn: 'শতকরা মানে প্রতি একশোতে',
        body:
          'A percentage is a fraction whose denominator is fixed at 100. Writing 25% is exactly the same as writing 25/100, or 0.25. Because the denominator never changes, percentages let you compare quantities of completely different sizes on one scale.',
        bodyBn:
          'শতকরা হলো এমন ভগ্নাংশ যার হর সর্বদা ১০০। ২৫% লেখা মানে ঠিক ২৫/১০০ বা ০.২৫ লেখা। হর কখনো বদলায় না, তাই সম্পূর্ণ ভিন্ন আকারের রাশিকেও একই মাপকাঠিতে তুলনা করা যায়।',
        expression: 'p% = p / 100',
      },
      {
        kind: 'visual',
        title: 'A hundred-square',
        titleBn: 'শত-বর্গ',
        body:
          'Picture a 10 × 10 grid of 100 small squares. Shading 25 of them shows 25%. Shading half the grid shows 50%. The picture makes it obvious that 100% is the whole grid, and that a percentage above 100 needs more than one grid.',
        bodyBn:
          '১০ × ১০ ঘরের একটি গ্রিড কল্পনা করুন, মোট ১০০টি ছোট ঘর। ২৫টি ঘর রং করলে সেটি ২৫%। অর্ধেক রং করলে ৫০%। ছবিটি থেকেই স্পষ্ট, ১০০% মানে পুরো গ্রিড, আর ১০০ এর বেশি হলে একটির চেয়ে বেশি গ্রিড দরকার।',
        visual: {
          kind: 'bars',
          values: [25, 50, 75, 100],
          labels: ['25%', '50%', '75%', '100%'],
          caption: 'Each bar is a share of the same whole.',
          captionBn: 'প্রতিটি স্তম্ভ একই মোট রাশির একটি অংশ।',
        },
      },
      {
        kind: 'simple_example',
        title: '10% is easy — build from it',
        titleBn: '১০% সহজ — এখান থেকেই শুরু',
        body:
          '10% of any number is that number with the decimal point moved one place left. 10% of 2400 is 240. From there: 5% is half of that (120), 20% is double (480), and 15% is 240 + 120 = 360.',
        bodyBn:
          'যেকোনো সংখ্যার ১০% মানে দশমিক বিন্দু এক ঘর বাঁয়ে সরানো। ২৪০০ এর ১০% = ২৪০। এখান থেকে: ৫% তার অর্ধেক (১২০), ২০% দ্বিগুণ (৪৮০), আর ১৫% = ২৪০ + ১২০ = ৩৬০।',
        expression: '15% of 2400 = 240 + 120 = 360',
      },
      {
        kind: 'worked_example',
        title: 'A shop discount, step by step',
        titleBn: 'দোকানের ছাড়, ধাপে ধাপে',
        body:
          'A shirt is marked ৳1200 with 25% off.\nStep 1 — discount = 25% of 1200 = 300.\nStep 2 — price paid = 1200 - 300 = ৳900.\nFaster route: 25% off means you pay 75%, and 75% of 1200 is three quarters of 1200 = 900. Both routes must agree; if they do not, one of them has an arithmetic slip.',
        bodyBn:
          'একটি শার্টের ধার্য মূল্য ১২০০ টাকা, ছাড় ২৫%।\nধাপ ১ — ছাড় = ১২০০ এর ২৫% = ৩০০।\nধাপ ২ — প্রদেয় দাম = ১২০০ - ৩০০ = ৯০০ টাকা।\nদ্রুত উপায়: ২৫% ছাড় মানে ৭৫% দিতে হবে, আর ১২০০ এর ৭৫% = তিন-চতুর্থাংশ = ৯০০। দুই উপায়ে একই উত্তর আসা উচিত; না এলে কোথাও হিসাবে ভুল আছে।',
        expression: '1200 × (1 - 25/100) = 1200 × 0.75 = 900',
      },
      {
        kind: 'practice',
        title: 'Your turn',
        titleBn: 'এবার আপনি',
        body:
          'Work through a mixed set: percent of a quantity, discounts and VAT. Aim for accuracy first and speed second.',
        bodyBn:
          'মিশ্র প্রশ্ন অভ্যাস করুন: শতকরা নির্ণয়, ছাড় ও ভ্যাট। আগে নির্ভুলতা, পরে গতি।',
      },
      {
        kind: 'challenge',
        title: 'Two changes in a row',
        titleBn: 'পরপর দুটি পরিবর্তন',
        body:
          'A price rises 20% and then falls 20%. Is it back where it started? No — a 20% rise on 100 gives 120, and a 20% fall from 120 gives 96. Successive percentage changes multiply, they do not add.',
        bodyBn:
          'একটি দাম ২০% বাড়ল, তারপর ২০% কমল। আগের জায়গায় ফিরল কি? না — ১০০ এর ২০% বৃদ্ধিতে ১২০, আর ১২০ থেকে ২০% হ্রাসে ৯৬। পরপর শতকরা পরিবর্তন যোগ হয় না, গুণ হয়।',
        expression: '100 × 1.20 × 0.80 = 96',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body:
          'Ten mixed questions with no hints. Passing needs 8 correct, which shows the idea is secure rather than freshly memorised.',
        bodyBn:
          'সংকেত ছাড়া দশটি মিশ্র প্রশ্ন। উত্তীর্ণ হতে ৮টি সঠিক দরকার, যা প্রমাণ করে ধারণাটি সত্যিই বসে গেছে।',
      },
    ],
  },
  {
    id: 'lesson.fractions-add',
    topicId: 'fractions',
    skillIds: ['skill.fraction-arithmetic', 'skill.fraction-compare'],
    title: 'Adding and Subtracting Fractions',
    titleBn: 'ভগ্নাংশের যোগ ও বিয়োগ',
    summary: 'Fractions can only be added once the pieces are the same size.',
    summaryBn: 'টুকরোগুলো সমান আকারের হলেই ভগ্নাংশ যোগ করা যায়।',
    minutes: 14,
    generators: ['frac.arithmetic', 'frac.compare', 'frac.of-quantity'],
    sections: [
      {
        kind: 'concept',
        title: 'The denominator names the piece',
        titleBn: 'হর বলে টুকরোর আকার',
        body:
          'In 3/4 the denominator 4 says the whole was cut into four equal pieces, and the numerator 3 says we have three of them. You can only add counts of pieces that are the same size, which is why 1/2 + 1/3 is not 2/5.',
        bodyBn:
          '৩/৪ এ হর ৪ বলে পুরোটাকে চার সমান ভাগে ভাগ করা হয়েছে, আর লব ৩ বলে আমাদের কাছে তিনটি ভাগ আছে। সমান আকারের টুকরোই যোগ করা যায়, তাই ১/২ + ১/৩ কখনো ২/৫ হয় না।',
        expression: '1/2 + 1/3 ≠ 2/5',
      },
      {
        kind: 'visual',
        title: 'Cut the bars the same way',
        titleBn: 'একইভাবে বার কাটুন',
        body:
          'Draw two identical bars. Cut the first into halves and shade one. Cut the second into thirds and shade one. Now cut both into sixths: the first shows 3/6 and the second 2/6. Together that is 5/6.',
        bodyBn:
          'দুটি একই মাপের বার আঁকুন। প্রথমটিকে দুই ভাগে ভাগ করে একটি রং করুন। দ্বিতীয়টিকে তিন ভাগে ভাগ করে একটি রং করুন। এখন দুটোকেই ছয় ভাগে ভাগ করুন: প্রথমটি ৩/৬, দ্বিতীয়টি ২/৬। একসাথে ৫/৬।',
        visual: {
          kind: 'fraction',
          values: [3, 6, 2, 6],
          labels: ['3/6', '2/6'],
          caption: 'Same-sized pieces can be counted together.',
          captionBn: 'সমান আকারের টুকরো একসাথে গোনা যায়।',
        },
      },
      {
        kind: 'simple_example',
        title: 'When the denominators already match',
        titleBn: 'হর আগেই সমান হলে',
        body: 'Add the numerators and keep the denominator: 2/7 + 3/7 = 5/7. Nothing else changes.',
        bodyBn: 'লব যোগ করুন, হর অপরিবর্তিত রাখুন: ২/৭ + ৩/৭ = ৫/৭। আর কিছু বদলায় না।',
        expression: '2/7 + 3/7 = 5/7',
      },
      {
        kind: 'worked_example',
        title: 'Different denominators',
        titleBn: 'ভিন্ন হর',
        body:
          'Compute 5/6 - 3/8.\nStep 1 — LCM(6, 8) = 24.\nStep 2 — 5/6 = 20/24 and 3/8 = 9/24.\nStep 3 — 20/24 - 9/24 = 11/24.\nStep 4 — check: 11 and 24 share no factor, so it is already in lowest terms.',
        bodyBn:
          '৫/৬ - ৩/৮ নির্ণয় করুন।\nধাপ ১ — লসাগু(৬, ৮) = ২৪।\nধাপ ২ — ৫/৬ = ২০/২৪ এবং ৩/৮ = ৯/২৪।\nধাপ ৩ — ২০/২৪ - ৯/২৪ = ১১/২৪।\nধাপ ৪ — যাচাই: ১১ ও ২৪ এর সাধারণ উৎপাদক নেই, তাই এটি সরলতম আকারেই আছে।',
        expression: '5/6 - 3/8 = 20/24 - 9/24 = 11/24',
      },
      {
        kind: 'practice',
        title: 'Mixed fraction practice',
        titleBn: 'মিশ্র অভ্যাস',
        body: 'Practise all four operations and comparisons until the common-denominator step feels automatic.',
        bodyBn: 'সাধারণ হর বের করার ধাপটি স্বয়ংক্রিয় হয়ে যাওয়া পর্যন্ত চারটি প্রক্রিয়া ও তুলনা অভ্যাস করুন।',
      },
      {
        kind: 'challenge',
        title: 'Which is larger?',
        titleBn: 'কোনটি বড়?',
        body:
          'Compare 7/9 and 8/11 without a calculator. Cross multiply: 7 × 11 = 77 and 8 × 9 = 72. Since 77 > 72, 7/9 is larger. Cross multiplication is just the common-denominator method with the writing skipped.',
        bodyBn:
          'ক্যালকুলেটর ছাড়া ৭/৯ ও ৮/১১ তুলনা করুন। তির্যক গুণ: ৭ × ১১ = ৭৭ এবং ৮ × ৯ = ৭২। ৭৭ > ৭২, তাই ৭/৯ বড়। তির্যক গুণ আসলে সাধারণ হর পদ্ধতিরই সংক্ষিপ্ত রূপ।',
        expression: '7 × 11 = 77 > 72 = 8 × 9',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten questions covering all four operations plus one comparison.',
        bodyBn: 'চারটি প্রক্রিয়া ও একটি তুলনা মিলিয়ে দশটি প্রশ্ন।',
      },
    ],
  },
  {
    id: 'lesson.linear-equations',
    topicId: 'linear-equations',
    skillIds: ['skill.solve-linear', 'skill.word-equation'],
    title: 'Solving Linear Equations',
    titleBn: 'সরল সমীকরণ সমাধান',
    summary: 'An equation is a balance: whatever you do to one side, do to the other.',
    summaryBn: 'সমীকরণ একটি দাঁড়িপাল্লা: এক পাশে যা করবেন, অন্য পাশেও তাই করতে হবে।',
    minutes: 15,
    generators: ['alg.solve-linear', 'alg.solve-linear-both-sides', 'alg.word-equation'],
    sections: [
      {
        kind: 'concept',
        title: 'Keep the balance',
        titleBn: 'ভারসাম্য রাখুন',
        body:
          'The equals sign is a promise that both sides weigh the same. Adding, subtracting, multiplying or dividing both sides by the same non-zero amount keeps that promise, and every solving step is one of those four moves.',
        bodyBn:
          'সমান চিহ্ন মানে দুই পাশের ওজন সমান। উভয় পাশে একই সংখ্যা যোগ, বিয়োগ, গুণ বা (শূন্য নয় এমন সংখ্যা দিয়ে) ভাগ করলে সেই সমতা বজায় থাকে — সমাধানের প্রতিটি ধাপ এই চারটির একটি।',
        expression: 'if a = b then a + c = b + c',
      },
      {
        kind: 'visual',
        title: 'A weighing scale',
        titleBn: 'দাঁড়িপাল্লা',
        body:
          'Imagine 3 identical boxes plus a 5 kg weight balancing a 20 kg weight. Remove 5 kg from both pans: 3 boxes now balance 15 kg. Split both pans into three: one box is 5 kg. That is exactly how 3x + 5 = 20 is solved.',
        bodyBn:
          'কল্পনা করুন, ৩টি একই বাক্স ও ৫ কেজি বাটখারা একদিকে, অন্যদিকে ২০ কেজি — পাল্লা সমান। দুই পাশ থেকে ৫ কেজি সরান: ৩ বাক্স = ১৫ কেজি। দুই পাশকে তিন ভাগে ভাগ করুন: এক বাক্স = ৫ কেজি। ৩x + ৫ = ২০ ঠিক এভাবেই সমাধান হয়।',
        visual: {
          kind: 'numberline',
          values: [0, 5, 10, 15, 20],
          labels: ['0', '5', '10', '15', '20'],
          caption: 'Removing 5 from both sides slides the whole problem left.',
          captionBn: 'দুই পাশ থেকে ৫ সরালে পুরো সমস্যাটি বাঁয়ে সরে যায়।',
        },
      },
      {
        kind: 'simple_example',
        title: 'One step',
        titleBn: 'এক ধাপ',
        body: 'x + 7 = 12. Subtract 7 from both sides: x = 5. Always check by substituting: 5 + 7 = 12. ✓',
        bodyBn: 'x + ৭ = ১২। দুই পাশে ৭ বিয়োগ করুন: x = ৫। মান বসিয়ে যাচাই করুন: ৫ + ৭ = ১২। ✓',
        expression: 'x + 7 = 12 → x = 5',
      },
      {
        kind: 'worked_example',
        title: 'Variables on both sides',
        titleBn: 'দুই পাশে চলক',
        body:
          'Solve 5x - 4 = 2x + 11.\nStep 1 — subtract 2x from both sides: 3x - 4 = 11.\nStep 2 — add 4 to both sides: 3x = 15.\nStep 3 — divide by 3: x = 5.\nStep 4 — check: 5(5) - 4 = 21 and 2(5) + 11 = 21. ✓',
        bodyBn:
          '৫x - ৪ = ২x + ১১ সমাধান করুন।\nধাপ ১ — দুই পাশে ২x বিয়োগ: ৩x - ৪ = ১১।\nধাপ ২ — দুই পাশে ৪ যোগ: ৩x = ১৫।\nধাপ ৩ — ৩ দিয়ে ভাগ: x = ৫।\nধাপ ৪ — যাচাই: ৫(৫) - ৪ = ২১ এবং ২(৫) + ১১ = ২১। ✓',
        expression: '5x - 4 = 2x + 11 → x = 5',
      },
      {
        kind: 'practice',
        title: 'Practice set',
        titleBn: 'অভ্যাস',
        body: 'Solve one-step, two-step and both-sides equations, checking every answer by substitution.',
        bodyBn: 'এক ধাপ, দুই ধাপ ও দুই পাশে চলকযুক্ত সমীকরণ সমাধান করুন এবং প্রতিটি উত্তর মান বসিয়ে যাচাই করুন।',
      },
      {
        kind: 'challenge',
        title: 'From words to symbols',
        titleBn: 'শব্দ থেকে প্রতীকে',
        body:
          'Two friends have 47 marbles together, and one has 9 more than the other. Let the smaller amount be x. Then x + (x + 9) = 47, so 2x = 38 and x = 19. The other has 28. Naming the smaller quantity keeps the algebra positive and simple.',
        bodyBn:
          'দুই বন্ধুর মোট ৪৭টি মার্বেল, একজনের ৯টি বেশি। ছোট সংখ্যাটিকে x ধরুন। তাহলে x + (x + ৯) = ৪৭, অর্থাৎ ২x = ৩৮, x = ১৯। অন্যজনের ২৮টি। ছোট রাশিকে x ধরলে হিসাব ধনাত্মক ও সহজ থাকে।',
        expression: 'x + (x + 9) = 47 → x = 19',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten equations, including two word problems, with no hints available.',
        bodyBn: 'দশটি সমীকরণ, এর মধ্যে দুটি শব্দ সমস্যা; কোনো সংকেত থাকবে না।',
      },
    ],
  },
  {
    id: 'lesson.pythagoras',
    topicId: 'triangles',
    skillIds: ['skill.pythagoras', 'skill.triangle-properties'],
    title: 'Pythagoras Theorem',
    titleBn: 'পিথাগোরাসের উপপাদ্য',
    summary: 'In a right triangle, the square on the hypotenuse equals the sum of the other two squares.',
    summaryBn: 'সমকোণী ত্রিভুজে অতিভুজের বর্গ অপর দুই বাহুর বর্গের সমষ্টির সমান।',
    minutes: 13,
    generators: ['geo.pythagoras', 'geo.coordinates'],
    sections: [
      {
        kind: 'concept',
        title: 'Only for right angles',
        titleBn: 'শুধু সমকোণে',
        body:
          'The theorem describes squares built on the three sides of a right-angled triangle. The two smaller squares together have exactly the same area as the largest one. Remove the right angle and the relationship fails.',
        bodyBn:
          'উপপাদ্যটি সমকোণী ত্রিভুজের তিন বাহুর উপর আঁকা বর্গক্ষেত্র নিয়ে কথা বলে। ছোট দুটি বর্গের ক্ষেত্রফল একসাথে বড়টির সমান। সমকোণ না থাকলে এই সম্পর্ক আর খাটে না।',
        expression: 'a² + b² = c²',
      },
      {
        kind: 'visual',
        title: 'Three squares',
        titleBn: 'তিনটি বর্গ',
        body:
          'For the 3-4-5 triangle, draw squares of area 9, 16 and 25 on the three sides. 9 + 16 = 25, so the two smaller squares can be cut up and rearranged to fill the largest exactly.',
        bodyBn:
          '৩-৪-৫ ত্রিভুজে তিন বাহুর উপর ৯, ১৬ ও ২৫ ক্ষেত্রফলের বর্গ আঁকুন। ৯ + ১৬ = ২৫, তাই ছোট দুটি বর্গ কেটে সাজিয়ে বড়টিকে ঠিকঠাক ভরাট করা যায়।',
        visual: {
          kind: 'shape',
          values: [3, 4, 5],
          labels: ['a = 3', 'b = 4', 'c = 5'],
          caption: 'Areas 9 + 16 = 25.',
          captionBn: 'ক্ষেত্রফল ৯ + ১৬ = ২৫।',
        },
      },
      {
        kind: 'simple_example',
        title: 'Find the hypotenuse',
        titleBn: 'অতিভুজ নির্ণয়',
        body: 'Legs 6 and 8: c² = 36 + 64 = 100, so c = 10.',
        bodyBn: 'বাহু ৬ ও ৮: c² = ৩৬ + ৬৪ = ১০০, তাই c = ১০।',
        expression: '6² + 8² = 100 → c = 10',
      },
      {
        kind: 'worked_example',
        title: 'Find a missing leg',
        titleBn: 'অজানা বাহু নির্ণয়',
        body:
          'A ladder 13 m long leans against a wall with its foot 5 m from the wall. How high does it reach?\nStep 1 — the ladder is the hypotenuse: 13² = 5² + h².\nStep 2 — 169 = 25 + h², so h² = 144.\nStep 3 — h = 12 m.\nThe answer is sensible: the height must be less than the ladder length.',
        bodyBn:
          '১৩ মিটার লম্বা একটি মইয়ের গোড়া দেয়াল থেকে ৫ মিটার দূরে। মইটি কত উঁচুতে পৌঁছাবে?\nধাপ ১ — মইটিই অতিভুজ: ১৩² = ৫² + h²।\nধাপ ২ — ১৬৯ = ২৫ + h², তাই h² = ১৪৪।\nধাপ ৩ — h = ১২ মিটার।\nউত্তরটি যুক্তিসঙ্গত: উচ্চতা মইয়ের দৈর্ঘ্যের চেয়ে কম হতেই হবে।',
        expression: '13² - 5² = 144 → h = 12',
      },
      {
        kind: 'practice',
        title: 'Practice with triples',
        titleBn: 'ত্রয়ী দিয়ে অভ্যাস',
        body:
          'Learn to recognise 3-4-5, 5-12-13, 8-15-17 and 7-24-25. Spotting a triple saves the whole calculation.',
        bodyBn:
          '৩-৪-৫, ৫-১২-১৩, ৮-১৫-১৭ ও ৭-২৪-২৫ চিনতে শিখুন। ত্রয়ী চিনতে পারলে পুরো হিসাবই বেঁচে যায়।',
      },
      {
        kind: 'challenge',
        title: 'Is it a right triangle?',
        titleBn: 'এটি কি সমকোণী?',
        body:
          'Sides 9, 40, 41: 81 + 1600 = 1681 = 41². Yes. Sides 4, 5, 8: 16 + 25 = 41 but 8² = 64, so no. The converse of the theorem is a right-angle test.',
        bodyBn:
          'বাহু ৯, ৪০, ৪১: ৮১ + ১৬০০ = ১৬৮১ = ৪১²। হ্যাঁ। বাহু ৪, ৫, ৮: ১৬ + ২৫ = ৪১ কিন্তু ৮² = ৬৪, তাই না। উপপাদ্যের বিপরীত রূপটি সমকোণ পরীক্ষার কাজ করে।',
        expression: '9² + 40² = 41² ✓',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten questions mixing hypotenuse, missing leg and coordinate distance.',
        bodyBn: 'অতিভুজ, অজানা বাহু ও স্থানাঙ্ক দূরত্ব মিলিয়ে দশটি প্রশ্ন।',
      },
    ],
  },
  {
    id: 'lesson.probability-basics',
    topicId: 'basic-probability',
    skillIds: ['skill.probability-basic'],
    title: 'What Probability Really Means',
    titleBn: 'সম্ভাব্যতা আসলে কী',
    summary: 'Probability is a count of favourable outcomes over a count of equally likely outcomes.',
    summaryBn: 'সম্ভাব্যতা হলো অনুকূল ফলের সংখ্যা ÷ সমসম্ভাব্য মোট ফলের সংখ্যা।',
    minutes: 12,
    generators: ['prob.dice-coin', 'prob.conditional'],
    sections: [
      {
        kind: 'concept',
        title: 'Count, do not guess',
        titleBn: 'আন্দাজ নয়, গণনা',
        body:
          'Probability is a fraction between 0 and 1. The denominator counts every equally likely outcome; the numerator counts the ones you want. The phrase "equally likely" is doing real work: if the outcomes are not equally likely, this simple count is wrong.',
        bodyBn:
          'সম্ভাব্যতা ০ থেকে ১ এর মধ্যে একটি ভগ্নাংশ। হরে সব সমসম্ভাব্য ফল, লবে কাঙ্ক্ষিত ফল। "সমসম্ভাব্য" কথাটি খুব গুরুত্বপূর্ণ: ফলগুলো সমসম্ভাব্য না হলে এই সরল গণনা ভুল হবে।',
        expression: 'P(E) = favourable / total',
      },
      {
        kind: 'visual',
        title: 'The sample space of two dice',
        titleBn: 'দুই ছক্কার নমুনাক্ষেত্র',
        body:
          'Two dice have 36 equally likely outcomes, not 11. A sum of 7 happens 6 ways, so P = 6/36 = 1/6, while a sum of 2 happens once, so P = 1/36. Sums are not equally likely even though single-die faces are.',
        bodyBn:
          'দুই ছক্কায় ৩৬টি সমসম্ভাব্য ফল, ১১টি নয়। যোগফল ৭ হয় ৬ উপায়ে, তাই P = ৬/৩৬ = ১/৬; যোগফল ২ হয় ১ উপায়ে, তাই P = ১/৩৬। এক ছক্কার পিঠগুলো সমসম্ভাব্য হলেও যোগফলগুলো নয়।',
        visual: {
          kind: 'bars',
          values: [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],
          labels: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
          caption: 'Ways to make each sum with two dice.',
          captionBn: 'দুই ছক্কায় প্রতিটি যোগফল পাওয়ার উপায়ের সংখ্যা।',
        },
      },
      {
        kind: 'simple_example',
        title: 'One die',
        titleBn: 'একটি ছক্কা',
        body: 'An even number: {2, 4, 6} out of {1..6}, so P = 3/6 = 1/2.',
        bodyBn: 'জোড় সংখ্যা: {২, ৪, ৬}, মোট {১..৬}, তাই P = ৩/৬ = ১/২।',
        expression: 'P(even) = 3/6 = 1/2',
      },
      {
        kind: 'worked_example',
        title: 'Two balls without replacement',
        titleBn: 'প্রতিস্থাপন ছাড়া দুটি বল',
        body:
          'A bag has 5 red and 3 blue balls. Draw two without replacement; what is P(both red)?\nStep 1 — first draw: 5/8.\nStep 2 — one red is now gone: 4/7.\nStep 3 — multiply: (5/8)(4/7) = 20/56 = 5/14.\nThe second fraction changed because the first draw changed the bag.',
        bodyBn:
          'একটি ব্যাগে ৫টি লাল ও ৩টি নীল বল। প্রতিস্থাপন ছাড়া দুটি তুললে দুটোই লাল হওয়ার সম্ভাবনা কত?\nধাপ ১ — প্রথম তোলা: ৫/৮।\nধাপ ২ — একটি লাল কমে গেছে: ৪/৭।\nধাপ ৩ — গুণ: (৫/৮)(৪/৭) = ২০/৫৬ = ৫/১৪।\nদ্বিতীয় ভগ্নাংশ বদলেছে কারণ প্রথম তোলা ব্যাগটাই বদলে দিয়েছে।',
        expression: '(5/8) × (4/7) = 5/14',
      },
      {
        kind: 'practice',
        title: 'Practice set',
        titleBn: 'অভ্যাস',
        body: 'Dice, coins and cards, then draws with and without replacement.',
        bodyBn: 'ছক্কা, মুদ্রা ও তাস, এরপর প্রতিস্থাপনসহ ও প্রতিস্থাপন ছাড়া তোলা।',
      },
      {
        kind: 'challenge',
        title: 'Run the experiment',
        titleBn: 'পরীক্ষাটি চালান',
        body:
          'In the Probability Lab, toss a coin 20 times, then 20,000 times. The short run swings wildly; the long run settles near 0.5. That settling is the law of large numbers, and it is why a small sample proves nothing.',
        bodyBn:
          'প্রোবাবিলিটি ল্যাবে ২০ বার, তারপর ২০,০০০ বার মুদ্রা নিক্ষেপ করুন। অল্প বারে ফল খুব ওঠানামা করে; বেশি বারে ০.৫ এর কাছে স্থির হয়। এই স্থিরতাই বৃহৎ সংখ্যার বিধি — আর তাই ছোট নমুনা কিছুই প্রমাণ করে না।',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten questions including two without-replacement problems.',
        bodyBn: 'দশটি প্রশ্ন, এর মধ্যে দুটি প্রতিস্থাপন ছাড়া সমস্যা।',
      },
    ],
  },
  {
    id: 'lesson.mental-math',
    topicId: 'mental-math',
    skillIds: ['skill.mental-strategy', 'skill.estimate'],
    title: 'Mental Math Strategies',
    titleBn: 'মানসিক গণিতের কৌশল',
    summary: 'Choose a route before you calculate — the right strategy makes hard sums easy.',
    summaryBn: 'হিসাব শুরুর আগে পথ বাছুন — সঠিক কৌশলে কঠিন হিসাবও সহজ হয়।',
    minutes: 10,
    generators: ['brain.mental-math', 'brain.estimation', 'brain.strategy'],
    sections: [
      {
        kind: 'concept',
        title: 'Strategy before arithmetic',
        titleBn: 'হিসাবের আগে কৌশল',
        body:
          'Fast calculators are not faster at digits; they pick easier routes. Rounding and compensating, halving and doubling, and splitting by place value turn awkward numbers into friendly ones.',
        bodyBn:
          'যারা দ্রুত হিসাব করে তারা অঙ্কে দ্রুত নয় — তারা সহজ পথ বেছে নেয়। নিকটবর্তীকরণ ও সমন্বয়, অর্ধেক-দ্বিগুণ, এবং স্থানীয় মানে ভাগ করা — এসব কৌশল কঠিন সংখ্যাকে সহজ করে দেয়।',
      },
      {
        kind: 'visual',
        title: 'Three routes to one answer',
        titleBn: 'এক উত্তরের তিন পথ',
        body:
          'For 25 × 16: split as 25 × 4 × 4 = 100 × 4 = 400; or halve and double to 50 × 8 = 400; or use 25 = 100/4 to get 1600/4 = 400. Same answer, very different effort.',
        bodyBn:
          '২৫ × ১৬ এর জন্য: ২৫ × ৪ × ৪ = ১০০ × ৪ = ৪০০; অথবা অর্ধেক-দ্বিগুণ করে ৫০ × ৮ = ৪০০; অথবা ২৫ = ১০০/৪ ধরে ১৬০০/৪ = ৪০০। একই উত্তর, পরিশ্রম ভিন্ন।',
        visual: {
          kind: 'bars',
          values: [400, 400, 400],
          labels: ['×4×4', 'halve/double', '100/4'],
          caption: 'Three strategies, one result.',
          captionBn: 'তিন কৌশল, এক ফল।',
        },
      },
      {
        kind: 'simple_example',
        title: 'Near a round number',
        titleBn: 'পূর্ণ সংখ্যার কাছে',
        body: '98 × 7 = (100 - 2) × 7 = 700 - 14 = 686.',
        bodyBn: '৯৮ × ৭ = (১০০ - ২) × ৭ = ৭০০ - ১৪ = ৬৮৬।',
        expression: '98 × 7 = 700 - 14 = 686',
      },
      {
        kind: 'worked_example',
        title: 'A shopping total in your head',
        titleBn: 'মাথায় বাজারের হিসাব',
        body:
          'Items cost ৳198, ৳249 and ৳153.\nStep 1 — round up: 200 + 250 + 150 = 600.\nStep 2 — track the corrections: -2, -1, +3 → 0.\nStep 3 — total = ৳600 exactly.\nEstimating first also tells you immediately if the shopkeeper\'s total is far off.',
        bodyBn:
          'জিনিসের দাম ১৯৮, ২৪৯ ও ১৫৩ টাকা।\nধাপ ১ — পূর্ণ করুন: ২০০ + ২৫০ + ১৫০ = ৬০০।\nধাপ ২ — সংশোধন হিসাব রাখুন: -২, -১, +৩ → ০।\nধাপ ৩ — মোট = ঠিক ৬০০ টাকা।\nআগে আন্দাজ করলে দোকানির হিসাব অনেক বেশি হলে সাথে সাথেই ধরা পড়ে।',
        expression: '198 + 249 + 153 = 600',
      },
      {
        kind: 'practice',
        title: 'Speed practice',
        titleBn: 'দ্রুত অভ্যাস',
        body: 'Short timed sets. Say the strategy to yourself before you compute.',
        bodyBn: 'ছোট সময়সীমাযুক্ত সেট। হিসাব শুরুর আগে কৌশলটি নিজেকে বলুন।',
      },
      {
        kind: 'challenge',
        title: 'Estimate then check',
        titleBn: 'আন্দাজ, তারপর যাচাই',
        body:
          'Estimate 19% of 4,980 before computing. 20% of 5,000 is 1,000, so the answer is just under 1,000. The exact value is 946.2 — the estimate was the useful part.',
        bodyBn:
          'হিসাবের আগে ৪,৯৮০ এর ১৯% আন্দাজ করুন। ৫,০০০ এর ২০% = ১,০০০, তাই উত্তর ১,০০০ এর একটু কম। সঠিক মান ৯৪৬.২ — আন্দাজটাই আসল কাজে লেগেছে।',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten rapid questions, each solvable in under fifteen seconds with the right route.',
        bodyBn: 'দশটি দ্রুত প্রশ্ন, সঠিক কৌশলে প্রতিটি পনেরো সেকেন্ডের কমেই হবে।',
      },
    ],
  },
  {
    id: 'lesson.time-speed-distance',
    topicId: 'time-speed-distance',
    skillIds: ['skill.speed-distance'],
    title: 'Time, Speed and Distance',
    titleBn: 'সময়, গতি ও দূরত্ব',
    summary: 'One relationship, three rearrangements — and units decide everything.',
    summaryBn: 'একটি সম্পর্ক, তিনটি রূপ — আর সবকিছু ঠিক করে একক।',
    minutes: 13,
    generators: ['rate.speed-distance', 'rate.relative-speed', 'rate.train-crossing'],
    sections: [
      {
        kind: 'concept',
        title: 'One triangle of ideas',
        titleBn: 'একটি ধারণা-ত্রিভুজ',
        body:
          'distance = speed × time. Rearranged: speed = distance ÷ time and time = distance ÷ speed. There is only one fact here, so never memorise three separate formulas.',
        bodyBn:
          'দূরত্ব = গতি × সময়। সাজিয়ে: গতি = দূরত্ব ÷ সময় এবং সময় = দূরত্ব ÷ গতি। এখানে তথ্য একটিই, তাই আলাদা তিনটি সূত্র মুখস্থ করার দরকার নেই।',
        expression: 'd = s × t',
      },
      {
        kind: 'visual',
        title: 'Distance-time graph',
        titleBn: 'দূরত্ব-সময় লেখচিত্র',
        body:
          'Plot distance against time. A straight line means constant speed, and the steeper the line the faster the journey. A flat section means standing still.',
        bodyBn:
          'সময়ের বিপরীতে দূরত্ব আঁকুন। সরলরেখা মানে স্থির গতি, রেখা যত খাড়া গতি তত বেশি। সমান্তরাল অংশ মানে থেমে থাকা।',
        visual: {
          kind: 'numberline',
          values: [0, 60, 120, 120, 180],
          labels: ['0h', '1h', '2h', '3h', '4h'],
          caption: 'A flat stretch is a rest stop.',
          captionBn: 'সমান্তরাল অংশ মানে বিশ্রাম।',
        },
      },
      {
        kind: 'simple_example',
        title: 'Straightforward journey',
        titleBn: 'সরল যাত্রা',
        body: '50 km/h for 3 hours covers 150 km.',
        bodyBn: 'ঘণ্টায় ৫০ কিমি বেগে ৩ ঘণ্টায় ১৫০ কিমি।',
        expression: '50 × 3 = 150 km',
      },
      {
        kind: 'worked_example',
        title: 'A train crossing a platform',
        titleBn: 'ট্রেন প্ল্যাটফর্ম অতিক্রম',
        body:
          'A 200 m train at 72 km/h crosses a 300 m platform.\nStep 1 — the train must clear its own length plus the platform: 500 m.\nStep 2 — convert the speed: 72 × 5/18 = 20 m/s.\nStep 3 — time = 500 ÷ 20 = 25 s.\nThe common error is forgetting the train\'s own length.',
        bodyBn:
          '২০০ মিটার লম্বা ট্রেন ঘণ্টায় ৭২ কিমি বেগে ৩০০ মিটার প্ল্যাটফর্ম অতিক্রম করে।\nধাপ ১ — ট্রেনকে নিজের দৈর্ঘ্য ও প্ল্যাটফর্ম মিলিয়ে ৫০০ মিটার পার হতে হবে।\nধাপ ২ — গতি রূপান্তর: ৭২ × ৫/১৮ = ২০ মি/সে।\nধাপ ৩ — সময় = ৫০০ ÷ ২০ = ২৫ সেকেন্ড।\nসাধারণ ভুল হলো ট্রেনের নিজের দৈর্ঘ্য বাদ দেওয়া।',
        expression: '(200 + 300) / 20 = 25 s',
      },
      {
        kind: 'practice',
        title: 'Practice set',
        titleBn: 'অভ্যাস',
        body: 'Journeys, average speed, relative speed and train problems.',
        bodyBn: 'যাত্রা, গড় গতি, আপেক্ষিক গতি ও ট্রেনের সমস্যা।',
      },
      {
        kind: 'challenge',
        title: 'Average speed is not the average of speeds',
        titleBn: 'গড় গতি মানে গতির গড় নয়',
        body:
          'Travel 60 km at 60 km/h and back at 40 km/h. Times are 1 h and 1.5 h, so total 120 km in 2.5 h → 48 km/h, not 50. Average speed is always total distance over total time.',
        bodyBn:
          '৬০ কিমি ঘণ্টায় ৬০ কিমি বেগে গিয়ে ঘণ্টায় ৪০ কিমি বেগে ফিরুন। সময় ১ ঘণ্টা ও ১.৫ ঘণ্টা, মোট ১২০ কিমি ২.৫ ঘণ্টায় → ঘণ্টায় ৪৮ কিমি, ৫০ নয়। গড় গতি সর্বদা মোট দূরত্ব ÷ মোট সময়।',
        expression: '120 / 2.5 = 48 km/h',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten questions including one relative-speed and one train problem.',
        bodyBn: 'দশটি প্রশ্ন, এর মধ্যে একটি আপেক্ষিক গতি ও একটি ট্রেনের সমস্যা।',
      },
    ],
  },
  {
    id: 'lesson.hcf-lcm',
    topicId: 'number-theory',
    skillIds: ['skill.hcf-lcm', 'skill.primes'],
    title: 'HCF and LCM',
    titleBn: 'গসাগু ও লসাগু',
    summary: 'Prime factorisation turns both HCF and LCM into simple reading exercises.',
    summaryBn: 'মৌলিক উৎপাদকে বিশ্লেষণ করলে গসাগু ও লসাগু দুটোই সহজে পড়ে নেওয়া যায়।',
    minutes: 12,
    generators: ['nt.hcf-lcm', 'nt.divisibility', 'nt.divisor-count'],
    sections: [
      {
        kind: 'concept',
        title: 'Build numbers from primes',
        titleBn: 'মৌলিক সংখ্যা দিয়ে গড়া',
        body:
          'Every integer above 1 factorises into primes in exactly one way. Once both numbers are written that way, the HCF takes the lowest power of each shared prime and the LCM takes the highest power of every prime that appears.',
        bodyBn:
          '১ এর বড় প্রতিটি পূর্ণসংখ্যাকে ঠিক একভাবেই মৌলিক উৎপাদকে ভাঙা যায়। দুটি সংখ্যা এভাবে লেখার পর গসাগুতে সাধারণ মৌলিক উৎপাদকের সর্বনিম্ন ঘাত, আর লসাগুতে উপস্থিত সব উৎপাদকের সর্বোচ্চ ঘাত নেওয়া হয়।',
        expression: '360 = 2³ × 3² × 5',
      },
      {
        kind: 'visual',
        title: 'Factor tree',
        titleBn: 'উৎপাদক বৃক্ষ',
        body:
          'Split 360 into 36 × 10, then 36 into 6 × 6 and 10 into 2 × 5. Keep splitting until only primes remain: 2 × 2 × 2 × 3 × 3 × 5.',
        bodyBn:
          '৩৬০ কে ৩৬ × ১০ এ ভাগ করুন, তারপর ৩৬ কে ৬ × ৬ আর ১০ কে ২ × ৫ এ। শুধু মৌলিক সংখ্যা থাকা পর্যন্ত ভাঙুন: ২ × ২ × ২ × ৩ × ৩ × ৫।',
        visual: {
          kind: 'bars',
          values: [3, 2, 1],
          labels: ['2³', '3²', '5¹'],
          caption: 'Exponents in the factorisation of 360.',
          captionBn: '৩৬০ এর উৎপাদক বিশ্লেষণে ঘাতগুলো।',
        },
      },
      {
        kind: 'simple_example',
        title: 'Small numbers',
        titleBn: 'ছোট সংখ্যা',
        body: '12 = 2² × 3 and 18 = 2 × 3². HCF = 2 × 3 = 6, LCM = 2² × 3² = 36.',
        bodyBn: '১২ = ২² × ৩ এবং ১৮ = ২ × ৩²। গসাগু = ২ × ৩ = ৬, লসাগু = ২² × ৩² = ৩৬।',
        expression: 'HCF(12,18) = 6, LCM(12,18) = 36',
      },
      {
        kind: 'worked_example',
        title: 'A bell problem',
        titleBn: 'ঘণ্টার সমস্যা',
        body:
          'Three bells ring every 12, 18 and 30 minutes and start together. When do they next ring together?\nStep 1 — 12 = 2²×3, 18 = 2×3², 30 = 2×3×5.\nStep 2 — LCM takes the highest power of each: 2² × 3² × 5 = 180.\nStep 3 — 180 minutes = 3 hours.\nLCM answers "when do cycles line up"; HCF answers "what is the biggest equal group".',
        bodyBn:
          'তিনটি ঘণ্টা ১২, ১৮ ও ৩০ মিনিট পর পর বাজে এবং একসাথে শুরু হয়। পরের বার কখন একসাথে বাজবে?\nধাপ ১ — ১২ = ২²×৩, ১৮ = ২×৩², ৩০ = ২×৩×৫।\nধাপ ২ — লসাগুতে প্রতিটির সর্বোচ্চ ঘাত: ২² × ৩² × ৫ = ১৮০।\nধাপ ৩ — ১৮০ মিনিট = ৩ ঘণ্টা।\nলসাগু বলে "চক্র কখন মিলবে"; গসাগু বলে "সমান দলের সর্বোচ্চ আকার কত"।',
        expression: 'LCM(12, 18, 30) = 180',
      },
      {
        kind: 'practice',
        title: 'Practice set',
        titleBn: 'অভ্যাস',
        body: 'HCF, LCM, divisibility rules and counting divisors.',
        bodyBn: 'গসাগু, লসাগু, বিভাজ্যতার নিয়ম ও উৎপাদক গণনা।',
      },
      {
        kind: 'challenge',
        title: 'The product identity',
        titleBn: 'গুণফলের অভেদ',
        body:
          'For any two positive integers, HCF × LCM = the product of the numbers. Check: HCF(12,18) × LCM(12,18) = 6 × 36 = 216 = 12 × 18. This gives a free check on every answer.',
        bodyBn:
          'যেকোনো দুটি ধনাত্মক পূর্ণসংখ্যার জন্য গসাগু × লসাগু = সংখ্যাদুটির গুণফল। যাচাই: গসাগু(১২,১৮) × লসাগু(১২,১৮) = ৬ × ৩৬ = ২১৬ = ১২ × ১৮। এতে প্রতিটি উত্তর বিনা খরচে যাচাই করা যায়।',
        expression: 'HCF × LCM = a × b',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten questions, two of them word problems about repeating cycles.',
        bodyBn: 'দশটি প্রশ্ন, দুটি পুনরাবৃত্ত চক্র নিয়ে শব্দ সমস্যা।',
      },
    ],
  },
  {
    id: 'lesson.quadratics',
    topicId: 'quadratic-equations',
    skillIds: ['skill.solve-quadratic', 'skill.discriminant'],
    title: 'Solving Quadratic Equations',
    titleBn: 'দ্বিঘাত সমীকরণ সমাধান',
    summary: 'Factorise when you can, use the formula when you cannot, and read the discriminant first.',
    summaryBn: 'সম্ভব হলে উৎপাদক, না হলে সূত্র — আর আগে নিশ্চায়ক দেখুন।',
    minutes: 16,
    generators: ['alg.solve-quadratic', 'alg.discriminant', 'alg.expand'],
    sections: [
      {
        kind: 'concept',
        title: 'Two roots, one shape',
        titleBn: 'দুটি বীজ, একটি আকার',
        body:
          'A quadratic ax² + bx + c = 0 graphs as a parabola. Its roots are where the curve meets the x-axis, which is why there can be two, one, or none.',
        bodyBn:
          'ax² + bx + c = ০ আকারের সমীকরণের লেখচিত্র একটি পরাবৃত্ত। এর বীজ হলো যেখানে বক্ররেখা x অক্ষকে ছেদ করে — তাই বীজ দুটি, একটি বা কোনোটিই না হতে পারে।',
        expression: 'ax² + bx + c = 0',
      },
      {
        kind: 'visual',
        title: 'Where the curve cuts the axis',
        titleBn: 'বক্ররেখা কোথায় অক্ষ কাটে',
        body:
          'For x² - 5x + 6 the parabola crosses at x = 2 and x = 3. For x² - 4x + 4 it just touches at x = 2. For x² + 1 it never reaches the axis at all.',
        bodyBn:
          'x² - ৫x + ৬ এর পরাবৃত্ত x = ২ ও x = ৩ এ অক্ষ কাটে। x² - ৪x + ৪ শুধু x = ২ এ স্পর্শ করে। x² + ১ কখনোই অক্ষ পর্যন্ত পৌঁছায় না।',
        visual: {
          kind: 'numberline',
          values: [2, 3],
          labels: ['x = 2', 'x = 3'],
          caption: 'Roots of x² - 5x + 6.',
          captionBn: 'x² - ৫x + ৬ এর বীজ।',
        },
      },
      {
        kind: 'simple_example',
        title: 'Split the middle term',
        titleBn: 'মধ্যপদ ভাঙা',
        body:
          'x² - 5x + 6 = 0. Find two numbers multiplying to 6 and adding to -5: they are -2 and -3. So (x-2)(x-3) = 0 and x = 2 or 3.',
        bodyBn:
          'x² - ৫x + ৬ = ০। এমন দুটি সংখ্যা খুঁজুন যাদের গুণফল ৬ ও যোগফল -৫: সেগুলো -২ ও -৩। তাই (x-২)(x-৩) = ০, অর্থাৎ x = ২ বা ৩।',
        expression: '(x - 2)(x - 3) = 0',
      },
      {
        kind: 'worked_example',
        title: 'When factorising fails',
        titleBn: 'উৎপাদক না হলে',
        body:
          'Solve 2x² + 3x - 7 = 0.\nStep 1 — a = 2, b = 3, c = -7.\nStep 2 — D = 9 + 56 = 65, positive but not a perfect square, so it will not factorise nicely.\nStep 3 — x = (-3 ± √65)/4.\nStep 4 — numerically x ≈ 1.266 or x ≈ -2.766.\nAlways divide the whole numerator by 2a, not just the square root.',
        bodyBn:
          '২x² + ৩x - ৭ = ০ সমাধান করুন।\nধাপ ১ — a = ২, b = ৩, c = -৭।\nধাপ ২ — D = ৯ + ৫৬ = ৬৫, ধনাত্মক কিন্তু পূর্ণবর্গ নয়, তাই সুন্দরভাবে উৎপাদক হবে না।\nধাপ ৩ — x = (-৩ ± √৬৫)/৪।\nধাপ ৪ — সংখ্যায় x ≈ ১.২৬৬ বা x ≈ -২.৭৬৬।\nমনে রাখুন: পুরো লবকে ২a দিয়ে ভাগ করতে হবে, শুধু বর্গমূলকে নয়।',
        expression: 'x = (-3 ± √65) / 4',
      },
      {
        kind: 'practice',
        title: 'Practice set',
        titleBn: 'অভ্যাস',
        body: 'Factorisable quadratics, the formula, and discriminant questions.',
        bodyBn: 'উৎপাদকযোগ্য দ্বিঘাত, সূত্র প্রয়োগ ও নিশ্চায়কের প্রশ্ন।',
      },
      {
        kind: 'challenge',
        title: 'Read the roots off the coefficients',
        titleBn: 'সহগ থেকেই বীজ পড়া',
        body:
          'For x² - 7x + 12 = 0 the roots must add to 7 and multiply to 12, so they are 3 and 4 — no working needed. Sum = -b/a and product = c/a is often the fastest route in an exam.',
        bodyBn:
          'x² - ৭x + ১২ = ০ এর বীজের যোগফল ৭ ও গুণফল ১২ হতে হবে, তাই বীজ ৩ ও ৪ — আলাদা হিসাব লাগে না। যোগফল = -b/a এবং গুণফল = c/a — পরীক্ষায় প্রায়ই এটাই দ্রুততম পথ।',
        expression: 'α + β = -b/a, αβ = c/a',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten questions mixing factorisation, the formula and the nature of roots.',
        bodyBn: 'উৎপাদক, সূত্র ও বীজের প্রকৃতি মিলিয়ে দশটি প্রশ্ন।',
      },
    ],
  },
  {
    id: 'lesson.derivatives',
    topicId: 'differentiation',
    skillIds: ['skill.derivative', 'skill.limits'],
    title: 'What a Derivative Measures',
    titleBn: 'অন্তরজ কী মাপে',
    summary: 'A derivative is an instantaneous rate of change — the slope of the curve at one point.',
    summaryBn: 'অন্তরজ হলো তাৎক্ষণিক পরিবর্তনের হার — এক বিন্দুতে বক্ররেখার ঢাল।',
    minutes: 15,
    generators: ['calc.derivative', 'calc.limit', 'calc.integral'],
    sections: [
      {
        kind: 'concept',
        title: 'From average to instantaneous',
        titleBn: 'গড় থেকে তাৎক্ষণিক',
        body:
          'The slope between two points on a curve is an average rate of change. Slide the second point towards the first and that average approaches a single number: the derivative at the first point.',
        bodyBn:
          'বক্ররেখার দুই বিন্দুর মধ্যকার ঢাল হলো গড় পরিবর্তনের হার। দ্বিতীয় বিন্দুকে প্রথমটির দিকে সরাতে থাকলে সেই গড় একটি নির্দিষ্ট সংখ্যার দিকে যায় — সেটিই প্রথম বিন্দুতে অন্তরজ।',
        expression: "f'(x) = lim(h→0) [f(x+h) - f(x)] / h",
      },
      {
        kind: 'visual',
        title: 'Tangent line',
        titleBn: 'স্পর্শক',
        body:
          'On y = x², the chord from x = 1 to x = 2 has slope 3; from 1 to 1.5 it is 2.5; from 1 to 1.1 it is 2.1. The limit is 2, which is 2x at x = 1.',
        bodyBn:
          'y = x² এ x = ১ থেকে x = ২ পর্যন্ত জ্যার ঢাল ৩; ১ থেকে ১.৫ এ ২.৫; ১ থেকে ১.১ এ ২.১। সীমা ২, যা x = ১ এ ২x এর মান।',
        visual: {
          kind: 'bars',
          values: [3, 2.5, 2.1, 2],
          labels: ['h=1', 'h=0.5', 'h=0.1', 'limit'],
          caption: 'Chord slopes closing in on the tangent slope.',
          captionBn: 'জ্যার ঢাল স্পর্শকের ঢালের দিকে এগোচ্ছে।',
        },
      },
      {
        kind: 'simple_example',
        title: 'The power rule',
        titleBn: 'ঘাত সূত্র',
        body: 'd/dx x³ = 3x². Multiply by the power, then reduce the power by one.',
        bodyBn: 'd/dx x³ = ৩x²। ঘাত দিয়ে গুণ করে ঘাত এক কমান।',
        expression: 'd/dx xⁿ = n·xⁿ⁻¹',
      },
      {
        kind: 'worked_example',
        title: 'Differentiate term by term',
        titleBn: 'পদে পদে অন্তরীকরণ',
        body:
          "Differentiate f(x) = 3x⁴ - 5x² + 2x - 9.\nStep 1 — 3x⁴ → 12x³.\nStep 2 — -5x² → -10x.\nStep 3 — 2x → 2.\nStep 4 — the constant -9 → 0.\nSo f'(x) = 12x³ - 10x + 2. Constants vanish because a constant never changes.",
        bodyBn:
          "f(x) = ৩x⁴ - ৫x² + ২x - ৯ অন্তরীকরণ করুন।\nধাপ ১ — ৩x⁴ → ১২x³।\nধাপ ২ — -৫x² → -১০x।\nধাপ ৩ — ২x → ২।\nধাপ ৪ — ধ্রুবক -৯ → ০।\nতাই f'(x) = ১২x³ - ১০x + ২। ধ্রুবক কখনো বদলায় না, তাই তার অন্তরজ শূন্য।",
        expression: "f'(x) = 12x³ - 10x + 2",
      },
      {
        kind: 'practice',
        title: 'Practice set',
        titleBn: 'অভ্যাস',
        body: 'Polynomial derivatives, simple limits and definite integrals.',
        bodyBn: 'বহুপদীর অন্তরজ, সরল সীমা ও নির্দিষ্ট সমাকলন।',
      },
      {
        kind: 'challenge',
        title: 'Where is the curve flat?',
        titleBn: 'বক্ররেখা কোথায় সমতল?',
        body:
          "For f(x) = x³ - 3x, f'(x) = 3x² - 3 = 0 gives x = ±1. Those are the turning points, which is how derivatives find maxima and minima.",
        bodyBn:
          "f(x) = x³ - ৩x এর ক্ষেত্রে f'(x) = ৩x² - ৩ = ০ দিলে x = ±১। এগুলোই মোড় বিন্দু — এভাবেই অন্তরজ সর্বোচ্চ ও সর্বনিম্ন মান খুঁজে দেয়।",
        expression: "f'(x) = 0 at x = ±1",
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten questions across derivatives, limits and one integral.',
        bodyBn: 'অন্তরজ, সীমা ও একটি সমাকলন মিলিয়ে দশটি প্রশ্ন।',
      },
    ],
  },
  {
    id: 'lesson.data-interpretation',
    topicId: 'data-interpretation',
    skillIds: ['skill.chart-reading', 'skill.percent-of'],
    title: 'Reading Data Under Time Pressure',
    titleBn: 'সময়ের চাপে তথ্য পড়া',
    summary: 'In a competitive exam, reading the table correctly matters more than calculating fast.',
    summaryBn: 'প্রতিযোগিতামূলক পরীক্ষায় দ্রুত হিসাবের চেয়ে সারণি সঠিকভাবে পড়া বেশি জরুরি।',
    minutes: 11,
    generators: ['stat.chart', 'pct.change', 'ratio.average'],
    sections: [
      {
        kind: 'concept',
        title: 'Read the headers first',
        titleBn: 'আগে শিরোনাম পড়ুন',
        body:
          'Most lost marks in data interpretation come from misreading units, totals or which row a question refers to. Read the title, the units and the row labels before touching a number.',
        bodyBn:
          'তথ্য বিশ্লেষণে বেশিরভাগ নম্বর হারায় একক, মোট বা কোন সারির কথা বলা হচ্ছে — এসব ভুল পড়ার কারণে। সংখ্যা ছোঁয়ার আগে শিরোনাম, একক ও সারির নাম পড়ুন।',
      },
      {
        kind: 'visual',
        title: 'A five-month sales table',
        titleBn: 'পাঁচ মাসের বিক্রয় সারণি',
        body:
          'Sales in thousands: Jan 40, Feb 55, Mar 35, Apr 60, May 50. Total 240, average 48, highest April, lowest March.',
        bodyBn:
          'বিক্রয় (হাজারে): জানু ৪০, ফেব ৫৫, মার্চ ৩৫, এপ্রি ৬০, মে ৫০। মোট ২৪০, গড় ৪৮, সর্বোচ্চ এপ্রিল, সর্বনিম্ন মার্চ।',
        visual: {
          kind: 'bars',
          values: [40, 55, 35, 60, 50],
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          caption: 'Sales in thousands of taka.',
          captionBn: 'বিক্রয় (হাজার টাকায়)।',
        },
      },
      {
        kind: 'simple_example',
        title: 'Total and average',
        titleBn: 'মোট ও গড়',
        body: '40 + 55 + 35 + 60 + 50 = 240, so the monthly average is 240 ÷ 5 = 48 thousand.',
        bodyBn: '৪০ + ৫৫ + ৩৫ + ৬০ + ৫০ = ২৪০, তাই মাসিক গড় ২৪০ ÷ ৫ = ৪৮ হাজার।',
        expression: '240 / 5 = 48',
      },
      {
        kind: 'worked_example',
        title: 'Share of the total',
        titleBn: 'মোটের অংশ',
        body:
          'What percentage of the five-month total came from April?\nStep 1 — April = 60, total = 240.\nStep 2 — 60/240 = 0.25.\nStep 3 — 0.25 × 100 = 25%.\nA quick sanity check: April is the biggest month and there are five months, so a value a little above 20% is expected.',
        bodyBn:
          'পাঁচ মাসের মোট বিক্রয়ের কত শতাংশ এপ্রিলে হয়েছে?\nধাপ ১ — এপ্রিল = ৬০, মোট = ২৪০।\nধাপ ২ — ৬০/২৪০ = ০.২৫।\nধাপ ৩ — ০.২৫ × ১০০ = ২৫%।\nদ্রুত যাচাই: এপ্রিলই সর্বোচ্চ মাস আর মাস পাঁচটি, তাই ২০% এর একটু বেশি হওয়াই স্বাভাবিক।',
        expression: '60 / 240 × 100 = 25%',
      },
      {
        kind: 'practice',
        title: 'Practice set',
        titleBn: 'অভ্যাস',
        body: 'Totals, averages, shares and month-on-month change from small tables.',
        bodyBn: 'ছোট সারণি থেকে মোট, গড়, অংশ ও মাসভিত্তিক পরিবর্তন।',
      },
      {
        kind: 'challenge',
        title: 'Percentage change between rows',
        titleBn: 'সারির মধ্যে শতকরা পরিবর্তন',
        body:
          'From March (35) to April (60) the increase is 25 on a base of 35, which is 25/35 × 100 ≈ 71.4%. The base is always the earlier value, never the later one.',
        bodyBn:
          'মার্চ (৩৫) থেকে এপ্রিল (৬০) এ বৃদ্ধি ২৫, ভিত্তি ৩৫, অর্থাৎ ২৫/৩৫ × ১০০ ≈ ৭১.৪%। ভিত্তি সর্বদা আগের মান, পরের নয়।',
        expression: '25 / 35 × 100 ≈ 71.4%',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten timed questions from two small tables.',
        bodyBn: 'দুটি ছোট সারণি থেকে সময়সীমাযুক্ত দশটি প্রশ্ন।',
      },
    ],
  },
  {
    id: 'lesson.think-first',
    topicId: 'estimation',
    skillIds: ['skill.estimate', 'skill.mental-strategy'],
    title: 'Think First: Estimate Before You Solve',
    titleBn: 'আগে ভাবুন: সমাধানের আগে আন্দাজ',
    summary: 'An estimate is a safety net — it catches answers that are wildly wrong.',
    summaryBn: 'আন্দাজ একটি নিরাপত্তা জাল — একেবারে ভুল উত্তর সাথে সাথেই ধরা পড়ে।',
    minutes: 10,
    generators: ['brain.estimation', 'brain.strategy', 'brain.money'],
    sections: [
      {
        kind: 'concept',
        title: 'Why estimate at all?',
        titleBn: 'আন্দাজ কেন?',
        body:
          'An exact answer you cannot sanity-check is fragile. An estimate takes seconds and tells you the size of the answer, so a misplaced decimal point or a dropped zero becomes obvious immediately.',
        bodyBn:
          'যে সঠিক উত্তর যাচাই করা যায় না, তা ভঙ্গুর। আন্দাজে কয়েক সেকেন্ড লাগে আর উত্তরের আকার জানা যায়, ফলে দশমিক বিন্দু সরে গেলে বা একটি শূন্য বাদ পড়লে সাথে সাথেই চোখে পড়ে।',
      },
      {
        kind: 'visual',
        title: 'The four-step habit',
        titleBn: 'চার ধাপের অভ্যাস',
        body: 'Estimate → choose a strategy → solve → compare. The comparison is what turns practice into judgement.',
        bodyBn: 'আন্দাজ → কৌশল বাছাই → সমাধান → তুলনা। তুলনার ধাপটাই অভ্যাসকে বিচারবুদ্ধিতে পরিণত করে।',
        visual: {
          kind: 'numberline',
          values: [1, 2, 3, 4],
          labels: ['Estimate', 'Strategy', 'Solve', 'Compare'],
          caption: 'Think First loop.',
          captionBn: 'থিংক ফার্স্ট চক্র।',
        },
      },
      {
        kind: 'simple_example',
        title: 'Round and multiply',
        titleBn: 'পূর্ণ করে গুণ',
        body: '38 × 21 ≈ 40 × 20 = 800. The exact answer, 798, is right beside it.',
        bodyBn: '৩৮ × ২১ ≈ ৪০ × ২০ = ৮০০। সঠিক উত্তর ৭৯৮ — একেবারে পাশেই।',
        expression: '38 × 21 ≈ 800 (exact 798)',
      },
      {
        kind: 'worked_example',
        title: 'Estimating a monthly budget',
        titleBn: 'মাসিক বাজেট আন্দাজ',
        body:
          'Rent ৳9,800, food ৳6,200, transport ৳1,900, other ৳2,100.\nStep 1 — round: 10,000 + 6,000 + 2,000 + 2,000 = ৳20,000.\nStep 2 — corrections: -200 + 200 - 100 + 100 = 0.\nStep 3 — exact total ৳20,000.\nIf your calculator had shown ৳2,000 or ৳200,000, the estimate would have caught it instantly.',
        bodyBn:
          'বাসা ভাড়া ৯,৮০০, খাবার ৬,২০০, যাতায়াত ১,৯০০, অন্যান্য ২,১০০ টাকা।\nধাপ ১ — পূর্ণ করুন: ১০,০০০ + ৬,০০০ + ২,০০০ + ২,০০০ = ২০,০০০ টাকা।\nধাপ ২ — সংশোধন: -২০০ + ২০০ - ১০০ + ১০০ = ০।\nধাপ ৩ — সঠিক মোট ২০,০০০ টাকা।\nক্যালকুলেটরে ২,০০০ বা ২,০০,০০০ দেখালে আন্দাজই তা সাথে সাথে ধরে ফেলত।',
        expression: '9800 + 6200 + 1900 + 2100 = 20000',
      },
      {
        kind: 'practice',
        title: 'Estimate-first practice',
        titleBn: 'আন্দাজ-প্রথম অভ্যাস',
        body: 'Estimate in your head first, then type the exact answer. The solution that follows shows whether your estimate was in the right range.',
        bodyBn: 'আগে মনে মনে আন্দাজ করুন, তারপর সঠিক উত্তরটি লিখুন। এরপরের সমাধান দেখেই বুঝবেন আপনার আন্দাজ ঠিক সীমার মধ্যে ছিল কি না।',
      },
      {
        kind: 'challenge',
        title: 'Estimate something with no exact answer',
        titleBn: 'সঠিক উত্তর নেই এমন কিছু আন্দাজ',
        body:
          'How many litres of water does a family of five use in a month? Estimate 60 litres per person per day → 5 × 60 × 30 = 9,000 litres. There is no single right answer, but a defensible method beats a guess.',
        bodyBn:
          'পাঁচ জনের একটি পরিবার মাসে কত লিটার পানি ব্যবহার করে? ধরুন জনপ্রতি দিনে ৬০ লিটার → ৫ × ৬০ × ৩০ = ৯,০০০ লিটার। এখানে একটিমাত্র সঠিক উত্তর নেই, কিন্তু যুক্তিসঙ্গত পদ্ধতি আন্দাজের চেয়ে অনেক ভালো।',
      },
      {
        kind: 'mastery_test',
        title: 'Mastery check',
        titleBn: 'দক্ষতা যাচাই',
        body: 'Ten estimation questions where being close counts as correct.',
        bodyBn: 'দশটি আন্দাজের প্রশ্ন, যেখানে কাছাকাছি হলেই সঠিক ধরা হবে।',
      },
    ],
  },
];

export const LESSONS: Lesson[] = SEEDS.map((seed, index) => ({
  id: seed.id,
  topicId: seed.topicId,
  skillIds: seed.skillIds,
  title: seed.title,
  titleBn: seed.titleBn,
  summary: seed.summary,
  summaryBn: seed.summaryBn,
  orderIndex: index,
  estimatedMinutes: seed.minutes,
  sections: seed.sections.map((s) => ({
    kind: s.kind,
    title: s.title,
    titleBn: s.titleBn,
    body: s.body,
    bodyBn: s.bodyBn,
    expression: s.expression,
    visual: s.visual,
  })),
  practiceGeneratorIds: seed.generators,
  contentVersion: CURRENT_CONTENT_VERSION,
}));
