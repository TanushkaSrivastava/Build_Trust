// BuildTrust Indian-Origin Mock Database

export const initialWorkers = [
  {
    id: "rajesh-kumar",
    name: "Rajesh Kumar",
    specialty: "Masonry",
    rating: 4.9,
    reviewsCount: 124,
    experience: 15,
    rate: 450, // in INR (₹)
    image: "/assets/images/worker_rajesh_kumar.png",
    verified: true,
    location: "Greater Noida",
    distance: 3, // km
    about: "I am a master mason with over 15 years of experience in structural brickwork, marble laying, and residential construction in Delhi NCR. My commitment is to deliver structural integrity and aesthetic precision to every project, whether it's a small home renovation or a large-scale housing development.",
    equipment: "I own a full set of professional masonry tools including laser levels, heavy-duty concrete mixers, and scaffolding systems, ensuring no delays due to rental equipment availability.",
    tags: ["Master Mason", "Structural Repair", "Safety Certified"],
    reviews: [
      { author: "Amit Sharma", date: "May 20, 2026", rating: 5, text: "Rajesh completed our boundary brick wall perfectly. On time, exact measurements, and clean work. Highly recommended!" },
      { author: "Sanjay Dutta", date: "April 14, 2026", rating: 4.8, text: "Very professional work. Did excellent granite installation in our lobby. Had all tools ready." }
    ],
    portfolio: [
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80"
    ]
  },
  {
    id: "manish-sharma",
    name: "Manish Sharma",
    specialty: "Electrical",
    rating: 4.9,
    reviewsCount: 98,
    experience: 12,
    rate: 350,
    image: "/assets/images/worker_marcus_thorne.png",
    verified: true,
    location: "Delhi NCR",
    distance: 6,
    about: "Commercial and residential master electrician in Delhi, specializing in panel upgrades, smart home wiring, inverter installations, and complete building rewires. Safety is my number one priority, and I adhere strictly to local Indian electrical codes.",
    equipment: "Equipped with commercial wire pullers, thermal imaging cameras for troubleshooting, and digital circuit analyzers.",
    tags: ["Master Electrician", "Smart Home", "Code Compliance"],
    reviews: [
      { author: "Linda Kapoor", date: "May 18, 2026", rating: 5, text: "Manish diagnosed an electrical issue in our main board that two other electricians missed. Fair price and very clean." },
      { author: "Rahul Trehan", date: "March 22, 2026", rating: 4.9, text: "Installed our EV charger quickly. Knew the local authority permit process inside out." }
    ],
    portfolio: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1558224494-ef8b217500d6?auto=format&fit=crop&w=300&q=80"
    ]
  },
  {
    id: "sunita-rao",
    name: "Sunita Rao",
    specialty: "Painting",
    rating: 4.8,
    reviewsCount: 86,
    experience: 8,
    rate: 280,
    image: "/assets/images/worker_sarah_jenkins.png",
    verified: true,
    location: "Mumbai",
    distance: 8,
    about: "Premium interior finisher and wall decorator based in Mumbai. I focus on high-detail paint finishes, wallpapering, custom texture walls, and wood polishing. Experienced in using premium Asian Paints and Dulux product lines.",
    equipment: "Equipped with professional airless sprayers, dust-free sanding machines, and a wide array of premium brush gear.",
    tags: ["Interior Specialist", "Texture Painting", "Eco Paint Certified"],
    reviews: [
      { author: "Emily Patel", date: "May 10, 2026", rating: 4.8, text: "Sunita painted our kitchen cabinets. They look brand new from a factory! Exceptionally neat work." },
      { author: "Rohan Lal", date: "April 02, 2026", rating: 5, text: "Great attention to detail. Covered everything meticulously and finished on schedule." }
    ],
    portfolio: [
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80"
    ]
  }
];

export const initialAdminState = {
  activeJobs: 124,
  pendingLeads: 42,
  completionRate: 80,
  onSchedule: 102,
  delayed: 22,
  unverifiedCount: 14,
  issuesCount: 2,
  criticalIssues: [
    { id: "issue1", title: "Safety Audit Overdue", desc: "Sector 44 project site requires urgent safety re-certification by EOD." },
    { id: "issue2", title: "Pending Dispute #421", desc: "Resolution timeline missing in 4 hours. Support intervention required." }
  ],
  liveOps: [
    { id: 1, text: "Job #1024 accepted by Ravi K.", time: "2 mins ago", type: "job", icon: "✓", color: "green-bg" },
    { id: 2, text: "Sector 62 new high-intent lead", time: "10 mins ago", type: "lead", icon: "★", color: "blue-bg" },
    { id: 3, text: "₹5,000 Payment settled successfully", time: "1 hour ago", type: "payment", icon: "₹", color: "yellow-bg" }
  ]
};
