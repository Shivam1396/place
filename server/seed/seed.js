require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const User = require('../models/User');

// [topic, text, options, answerIndex, difficulty(-2..2), companyTags, explanation]
const Q = [
  ['aptitude','A train 120 m long passes a pole in 6 s. Its speed is?',['10 m/s','20 m/s','25 m/s','30 m/s'],1,-1.5,['TCS','Infosys','Wipro'],'Speed = 120/6 = 20 m/s'],
  ['aptitude','What is 25% of 480?',['100','110','120','140'],2,-2,['TCS','Wipro'],'0.25 x 480 = 120'],
  ['aptitude','A can finish a job in 10 days, B in 15. Together they take?',['5','6','8','12'],1,0,['TCS','Infosys','Accenture'],'1/10+1/15 = 1/6'],
  ['aptitude','Price rises 20% then falls 20%. Net change?',['0%','-4%','+4%','-2%'],1,0.5,['Infosys','Amazon'],'1.2 x 0.8 = 0.96'],
  ['aptitude','Probability of getting a sum of 9 with two dice?',['1/6','1/9','1/12','5/36'],1,1,['Amazon','Google'],'4 outcomes of 36'],
  ['aptitude','Next in series: 2, 6, 12, 20, 30, ?',['40','42','44','36'],1,1.5,['Google','Amazon'],'n(n+1): 6x7=42'],
  ['dsa','Time complexity of binary search?',['O(n)','O(log n)','O(n log n)','O(1)'],1,-2,['TCS','Infosys','Amazon','Google'],'Halves search space'],
  ['dsa','Which structure uses LIFO?',['Queue','Stack','Heap','Graph'],1,-1.5,['TCS','Wipro','Infosys'],'Stack = Last In First Out'],
  ['dsa','Worst-case time of quicksort?',['O(n log n)','O(n)','O(n^2)','O(log n)'],2,-0.5,['Amazon','Google','Accenture'],'Bad pivots'],
  ['dsa','Which algorithm finds shortest paths with non-negative weights?',['DFS','Dijkstra','Kruskal','Prim'],1,0,['Amazon','Google'],'Dijkstra'],
  ['dsa','Detect a cycle in a linked list in O(1) space?',['Hash set','Floyd tortoise-hare','Sorting','Recursion'],1,0.8,['Amazon','Google'],'Two pointers'],
  ['dsa','Min number of edges in a connected graph with n nodes?',['n','n-1','n+1','n/2'],1,1.2,['Google'],'A spanning tree'],
  ['dsa','Amortized cost of push in a dynamic array?',['O(n)','O(log n)','O(1)','O(n^2)'],2,1.8,['Google','Amazon'],'Doubling strategy'],
  ['core','Which SQL clause filters grouped rows?',['WHERE','HAVING','GROUP BY','ORDER BY'],1,-1,['TCS','Infosys','Wipro'],'HAVING filters aggregates'],
  ['core','ACID: the "I" stands for?',['Integrity','Isolation','Inheritance','Indexing'],1,-1.2,['TCS','Infosys','Accenture'],'Isolation'],
  ['core','Which scheduling can cause starvation?',['Round Robin','FCFS','Priority','None'],2,0,['Amazon','Infosys'],'Low priority waits forever'],
  ['core','TCP vs UDP: which is connectionless?',['TCP','UDP','Both','Neither'],1,-0.5,['TCS','Wipro','Amazon'],'UDP'],
  ['core','Which normal form removes transitive dependency?',['1NF','2NF','3NF','BCNF only'],2,0.8,['Amazon','Google'],'3NF'],
  ['core','Condition NOT required for deadlock?',['Mutual exclusion','Hold and wait','Preemption','Circular wait'],2,1.3,['Google','Amazon'],'No preemption is required'],
  ['verbal','Choose the correct word: "She is ___ honest person."',['a','an','the','no article'],1,-2,['TCS','Wipro','Infosys'],'Vowel sound -> an'],
  ['verbal','Synonym of "Abundant":',['Scarce','Plentiful','Rare','Tiny'],1,-1,['TCS','Infosys','Accenture'],'Plentiful'],
  ['verbal','Antonym of "Benevolent":',['Kind','Malevolent','Generous','Gentle'],1,0,['Infosys','Accenture','Amazon'],'Malevolent'],
  ['verbal','Fill in: "Neither of the answers ___ correct."',['are','is','were','be'],1,0.5,['Accenture','Amazon'],'"Neither" takes singular'],
  ['verbal','Meaning of idiom "a blessing in disguise":',['A hidden good','A curse','A prayer','A surprise party'],0,-0.5,['TCS','Wipro'],'Good from apparent bad'],
  ['verbal','Which sentence is grammatically correct?',['He don\'t know','He doesn\'t knows','He doesn\'t know','He not know'],2,-1.2,['TCS','Wipro'],'Third-person singular negative'],
].map(([topic, text, options, answerIndex, difficulty, companyTags, explanation]) => ({ topic, text, options, answerIndex, difficulty, companyTags, explanation }));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Question.deleteMany({});
  await Question.insertMany(Q);
  for (const [name, email, role] of [['Prof. Rao', 'faculty@demo.com', 'faculty'], ['Demo Student', 'student@demo.com', 'student']]) {
    if (!(await User.findOne({ email }))) await User.create({ name, email, password: 'password123', role, department: 'AI&DS', batch: 2026, cgpa: 7.8 });
  }
  console.log(`Seeded ${Q.length} questions + demo users (faculty@demo.com / student@demo.com, password: password123)`);
  process.exit(0);
})();
