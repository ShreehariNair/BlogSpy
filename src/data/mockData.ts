import { Article, Competitor, SiteNode, TelemetryLog, RetryEvent, MonitoringCheck } from '../types';

export const INITIAL_COMPETITORS: Competitor[] = [
  {
    id: 'comp-1',
    name: 'TechCrunch Enterprise',
    domain: 'techcrunch.com',
    blogUrl: 'https://techcrunch.com/category/enterprise',
    feedUrl: 'https://techcrunch.com/category/enterprise/feed/',
    status: 'Active',
    strategy: 'Hybrid RSS+Sitemap',
    lastChecked: '42s ago',
    lastDetection: '14m ago',
    articlesScraped: 1842,
    healthScore: 100,
    etag: 'W/"7a8b9c1d"',
    cadence: '60s polling',
    detectedFeeds: ['/feed', '/rss'],
    discoveredSitemaps: ['/sitemap-posts.xml']
  },
  {
    id: 'comp-2',
    name: 'Cloudflare Engineering',
    domain: 'blog.cloudflare.com',
    blogUrl: 'https://blog.cloudflare.com',
    feedUrl: 'https://blog.cloudflare.com/rss/',
    status: 'Active',
    strategy: 'Hybrid RSS+Sitemap',
    lastChecked: '1m ago',
    lastDetection: '1h ago',
    articlesScraped: 964,
    healthScore: 99,
    etag: 'W/"e892-cloudflare"',
    cadence: '3m polling',
    detectedFeeds: ['/rss/'],
    discoveredSitemaps: ['/sitemap.xml']
  },
  {
    id: 'comp-3',
    name: 'Vercel Engineering & News',
    domain: 'vercel.com',
    blogUrl: 'https://vercel.com/blog',
    feedUrl: 'https://vercel.com/atom',
    status: 'Active',
    strategy: 'Sitemap Index',
    lastChecked: '3m ago',
    lastDetection: '2h ago',
    articlesScraped: 620,
    healthScore: 100,
    etag: 'W/"vercel-991"',
    cadence: '5m polling',
    detectedFeeds: ['/atom'],
    discoveredSitemaps: ['/sitemap.xml']
  },
  {
    id: 'comp-4',
    name: 'AWS Architecture Blog',
    domain: 'aws.amazon.com',
    blogUrl: 'https://aws.amazon.com/blogs/architecture',
    feedUrl: 'https://aws.amazon.com/blogs/architecture/feed/',
    status: 'Active',
    strategy: 'Sitemap Index',
    lastChecked: '4m ago',
    lastDetection: '3h ago',
    articlesScraped: 3120,
    healthScore: 98,
    etag: 'W/"aws-arch-41"',
    cadence: '5m polling',
    detectedFeeds: ['/feed/'],
    discoveredSitemaps: ['/sitemap.xml']
  },
  {
    id: 'comp-5',
    name: 'Datadog Security & Infra',
    domain: 'datadoghq.com',
    blogUrl: 'https://www.datadoghq.com/blog',
    feedUrl: 'https://www.datadoghq.com/blog/feed.xml',
    status: 'Active',
    strategy: 'Direct DOM Poller',
    lastChecked: '2m ago',
    lastDetection: '4h ago',
    articlesScraped: 840,
    healthScore: 97,
    etag: 'W/"dd-infra-92"',
    cadence: '10m polling',
    detectedFeeds: ['/feed.xml'],
    discoveredSitemaps: ['/sitemap_index.xml']
  },
  {
    id: 'comp-6',
    name: 'Supabase Official Blog',
    domain: 'supabase.com',
    blogUrl: 'https://supabase.com/blog',
    feedUrl: 'https://supabase.com/blog/rss.xml',
    status: 'Active',
    strategy: 'Hybrid RSS+Sitemap',
    lastChecked: '5m ago',
    lastDetection: '5h ago',
    articlesScraped: 412,
    healthScore: 100,
    etag: 'W/"supa-edge-88"',
    cadence: '5m polling',
    detectedFeeds: ['/rss.xml'],
    discoveredSitemaps: ['/sitemap.xml']
  },
  {
    id: 'comp-7',
    name: 'Stripe Engineering',
    domain: 'stripe.com',
    blogUrl: 'https://stripe.com/blog',
    feedUrl: 'https://stripe.com/blog/feed.rss',
    status: 'Active',
    strategy: 'Hybrid RSS+Sitemap',
    lastChecked: '6m ago',
    lastDetection: '8h ago',
    articlesScraped: 532,
    healthScore: 100,
    etag: 'W/"stripe-core-32"',
    cadence: '5m polling',
    detectedFeeds: ['/feed.rss'],
    discoveredSitemaps: ['/sitemap.xml']
  },
  {
    id: 'comp-8',
    name: 'Snowflake Developers',
    domain: 'snowflake.com',
    blogUrl: 'https://www.snowflake.com/blog',
    feedUrl: '',
    status: 'Paused',
    strategy: 'Direct DOM Poller',
    lastChecked: '28m ago',
    lastDetection: '1d ago',
    articlesScraped: 1104,
    healthScore: 92,
    etag: 'W/"snow-lake-19"',
    cadence: '15m polling',
    detectedFeeds: [],
    discoveredSitemaps: ['/sitemap.xml']
  }
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    competitor: 'TechCrunch',
    competitorDomain: 'techcrunch.com',
    title: 'Next-Gen Edge Inference: Bypassing Centralized Lakehouse Latency',
    snippet: 'New architecture benchmarks show distributed sub-millisecond tensor routing reduces multi-region egress costs by 40% while preserving strict ACID consistency.',
    content: `Today at the Global Cloud Architecture Forum, key industry players revealed extensive benchmarks outlining the shift away from monolithic data lakehouses toward edge-collocated inference pipelines.

Traditional enterprise architectures route inference requests through a central cloud hub. This causes unacceptable serialization delays and inflates cross-region egress overhead. By decoupling the tensor cache and deploying federated micro-caches, regional edge instances can evaluate transformer embeddings locally.

The benchmarks highlight a deterministic P99 latency drop from 340ms to just 42ms. Furthermore, organizations testing the federated protocol observed an average 40% reduction in cloud transit billing.

"This is not simply a caching optimization," commented Dr. Aris Thorne. "It represents an infrastructural inversion where query execution migrates directly to the network perimeter."

Our team analyzed the primary telemetry endpoints and confirmed that distributed consensus mechanisms like Raft-Lite are being implemented to synchronize cache invalidations in real-time.`,
    author: 'Sarah Jenkins',
    readTime: '4 min read',
    url: 'https://techcrunch.com/2025/edge-inference-architecture',
    canonicalUrl: 'https://techcrunch.com/2025/edge-inference-architecture',
    publishedAt: '14:22:18 UTC',
    publishedDate: '2025-09-24T14:22:18.000Z',
    discoveredAt: '14:25:30 UTC',
    discoveredDate: '2025-09-24T14:25:30.000Z',
    publicationSource: 'RSS <pubDate>',
    delaySec: 192,
    delayFormatted: '03m 12s delay',
    exactDelayText: '3 minutes 12 seconds',
    targetMet: true,
    isBackCatalog: false,
    ingestType: 'live',
    slaStatus: 'met',
    ingestMethod: 'RSS Feed',
    diffPayload: '+1.4KB Diff',
    diffAddedWords: 348,
    tags: ['Cloud Architecture', 'Edge Inference', 'Lakehouse Latency'],
    threatRating: 'High',
    featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    takeaways: [
      { label: 'Product Launch', value: 'Edge Tensor Ingestion Router v2.4 with native Kubernetes CRDs', type: 'launch' },
      { label: 'Market Threat', value: 'Direct positioning counter against our sub-millisecond distributed edge routing layer', type: 'threat' },
      { label: 'Cost Metric', value: '40% reduction in inter-region cloud egress bandwidth claims', type: 'metric' }
    ],
    citations: [
      { text: 'ACM Distributed Systems Benchmarks 2025', url: 'https://acm.org' },
      { text: 'Cloudflare Workers AI Documentation', url: 'https://developers.cloudflare.com' },
      { text: 'IEEE Spectrum: Caching at Cloud Scale', url: 'https://spectrum.ieee.org' }
    ],
    domSelector: 'article.post-content > .entry-body',
    analysis: {
      summary: 'TechCrunch reports an industry pivot toward federated edge inference that directly challenges centralized data warehouse topologies. The architecture cuts P99 latency to 42ms while lowering inter-region egress billing by 40%.',
      threatRating: 'High',
      threatExplanation: 'Direct threat to our core value proposition around centralized stream processing and edge caching efficiency.',
      takeaways: [
        'Competitor launched new cluster benchmark tool with native Kubernetes CRDs.',
        'Direct positioning against our sub-millisecond distributed edge routing layer.',
        'Heavily emphasizes a benchmarked 40% reduction in inter-region egress costs.'
      ],
      counterAction: 'Accelerate Q4 launch of our Edge Mesh v2 benchmark whitepaper highlighting 5.8x lower time-to-first-token, and publish an immediate comparative pricing calculator showing superior egress predictability.',
      analyzedAt: '14:25:34 UTC',
      source: 'gemini-ai'
    },
    rawPayload: {
      discovery_protocol: 'XML_SITEMAP_HEAD_POLL',
      worker_node: 'worker-us-east-04c',
      target_uri: 'https://techcrunch.com/2025/edge-inference-architecture',
      http_status: 200,
      dns_time_ms: 12.4,
      ttfb_ms: 84.1,
      payload_sha256: '9f83ac049384bcda9840294824e892f3c091823901b802a9bcae902b',
      vector_dims: 1536
    }
  },
  {
    id: 'art-2',
    competitor: 'Cloudflare Blog',
    competitorDomain: 'blog.cloudflare.com',
    title: 'Zero-Trust Pipeline Encryption: The Post-Quantum TLS Transition',
    snippet: 'Announcing default hybrid Kyber post-quantum key encapsulation for all edge proxy endpoints, shielding against harvest-now-decrypt-later attacks.',
    content: `Beginning today, Cloudflare is enabling hybrid post-quantum key exchange mechanisms across our global network by default for enterprise customers.

With quantum computing advancements accelerating, the risk of 'Store Now, Decrypt Later' (SNDL) attacks poses an immediate threat to high-security enterprise data. By combining traditional X25519 with ML-KEM (Kyber-768), connections are protected against both classical and future quantum adversaries without requiring additional handshake roundtrips.

Latency overhead was benchmarked across 300+ global data centers, demonstrating a nominal increase of less than 1.2ms during TLS 1.3 handshake negotiation.`,
    author: 'Nick Sullivan & Bas Westerbaan',
    readTime: '6 min read',
    url: 'https://blog.cloudflare.com/post-quantum-tls-default',
    canonicalUrl: 'https://blog.cloudflare.com/post-quantum-tls-default',
    publishedAt: '13:10:04 UTC',
    publishedDate: '2025-09-24T13:10:04.000Z',
    discoveredAt: '13:12:18 UTC',
    discoveredDate: '2025-09-24T13:12:18.000Z',
    publicationSource: 'JSON-LD schema (datePublished)',
    delaySec: 134,
    delayFormatted: '02m 14s delay',
    exactDelayText: '2 minutes 14 seconds',
    targetMet: true,
    isBackCatalog: false,
    ingestType: 'live',
    slaStatus: 'met',
    ingestMethod: 'RSS Feed',
    diffPayload: '+2.8KB Diff',
    diffAddedWords: 610,
    tags: ['Security', 'Post-Quantum', 'Cryptography'],
    threatRating: 'Medium',
    featuredImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    takeaways: [
      { label: 'Security Milestone', value: 'Default Kyber-768 post-quantum key exchange for edge tunnels', type: 'launch' },
      { label: 'Market Threat', value: 'Raises compliance bar for enterprise financial and healthcare prospects', type: 'threat' },
      { label: 'Overhead Metric', value: '< 1.2ms added handshake latency across 300+ PoPs', type: 'metric' }
    ],
    citations: [
      { text: 'NIST Post-Quantum Cryptography Standardization', url: 'https://nist.gov' }
    ],
    domSelector: 'div.post-content > section',
    analysis: {
      summary: 'Cloudflare enabled default hybrid Kyber-768 post-quantum encryption across all edge proxies with under 1.2ms handshake impact. This moves the enterprise compliance baseline forward against Store Now Decrypt Later adversaries.',
      threatRating: 'Medium',
      threatExplanation: 'Sets high security marketing narrative that financial clients might demand in upcoming RFPs.',
      takeaways: [
        'Default hybrid TLS 1.3 Kyber key encapsulation activated globally.',
        'Negligible latency penalty (<1.2ms) proves production readiness.',
        'Creates marketing leverage for enterprise security deals.'
      ],
      counterAction: 'Validate our own PQ-TLS roadmap timeline and issue an advisory note to high-tier customers explaining our zero-trust tunnel encryption architecture.',
      analyzedAt: '13:12:22 UTC',
      source: 'gemini-ai'
    }
  },
  {
    id: 'art-3',
    competitor: 'AWS Architecture Blog',
    competitorDomain: 'aws.amazon.com',
    title: 'Migrating Petabyte-Scale Vector Indices with Zero-Downtime Replication',
    snippet: 'Architectural blueprints for streaming vector database state across multi-region OpenSearch clusters with sub-second consistency bounds.',
    content: `Scaling retrieval-augmented generation (RAG) applications to hundreds of millions of embeddings introduces significant operational friction during index rebalancing.

In this deep dive, AWS solutions architects present a validated pattern combining Amazon Kinesis Data Streams with OpenSearch Service k-NN index aliases. By implementing a dual-write buffer with timestamped version vectors, enterprises can perform index compaction and dimension re-indexing without dropping live user queries.`,
    author: 'Chaitanya Shah & James Beswick',
    readTime: '8 min read',
    url: 'https://aws.amazon.com/blogs/architecture/zero-downtime-vector-indices',
    canonicalUrl: 'https://aws.amazon.com/blogs/architecture/zero-downtime-vector-indices',
    publishedAt: '11:40:12 UTC',
    publishedDate: '2025-09-24T11:40:12.000Z',
    discoveredAt: '11:48:54 UTC',
    discoveredDate: '2025-09-24T11:48:54.000Z',
    publicationSource: 'Sitemap <lastmod>',
    delaySec: 522,
    delayFormatted: '08m 42s delay',
    exactDelayText: '8 minutes 42 seconds',
    targetMet: false, // > 5m SLA threshold, triggers amber alert!
    isBackCatalog: false,
    ingestType: 'live',
    slaStatus: 'breached',
    slaBreachReason: 'Sitemap publication delta or indexing latency threshold exceeded (>5m)',
    ingestMethod: 'XML Sitemap',
    diffPayload: '+3.1KB Diff',
    diffAddedWords: 840,
    tags: ['Vector Search', 'AWS', 'Zero-Downtime'],
    threatRating: 'Low',
    featuredImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80',
    takeaways: [
      { label: 'Reference Pattern', value: 'Kinesis + OpenSearch vector stream replication architecture', type: 'launch' },
      { label: 'Market Threat', value: 'Validates enterprise need for our managed automated index migration tools', type: 'threat' },
      { label: 'Scale Metric', value: 'Validated on 250M vector embeddings at 99.99% query uptime', type: 'metric' }
    ],
    citations: [
      { text: 'AWS OpenSearch Vector Search Docs', url: 'https://aws.amazon.com' }
    ],
    domSelector: 'div.blog-post-content',
    analysis: {
      summary: 'AWS published an enterprise reference architecture for zero-downtime petabyte vector index migrations using Kinesis and OpenSearch. It highlights the rising infrastructure burden enterprise teams face when managing vector state manually.',
      threatRating: 'Low',
      threatExplanation: 'Validates market problem without offering a turnkey SaaS alternative; positions our managed solution favorably.',
      takeaways: [
        'Detailed step-by-step DIY migration architecture for OpenSearch users.',
        'Illustrates complex multi-component operational overhead.',
        'Confirms surging enterprise demand for zero-downtime vector upgrades.'
      ],
      counterAction: 'Create a social teardown highlighting how our 1-click managed vector migration requires zero pipeline configuration compared to AWS DIY multi-service blueprint.',
      analyzedAt: '11:49:01 UTC',
      source: 'gemini-ai'
    }
  },
  {
    id: 'art-4',
    competitor: 'Vercel News',
    competitorDomain: 'vercel.com',
    title: 'Streaming Incremental Static Regeneration at the Edge',
    snippet: 'Turbocharging ISR with streaming chunk invalidation: how instant cache hydration is replacing stale-while-revalidate for dynamic enterprise portals.',
    content: `Today we are unveiling the next evolution of Incremental Static Regeneration. By integrating Edge Middleware with HTTP chunked streaming responses, dynamic content can hydrate in parallel with static layouts.

This eliminates time-to-first-byte waiting times for personalized ecommerce grids, newsrooms, and real-time dashboards, maintaining 99.9% CDN cache hit ratios.`,
    author: 'Guillermo Rauch',
    readTime: '3 min read',
    url: 'https://vercel.com/blog/streaming-isr-edge',
    canonicalUrl: 'https://vercel.com/blog/streaming-isr-edge',
    publishedAt: '10:05:00 UTC',
    publishedDate: '2025-09-24T10:05:00.000Z',
    discoveredAt: '10:08:14 UTC',
    discoveredDate: '2025-09-24T10:08:14.000Z',
    publicationSource: 'HTML meta (article:published_time)',
    delaySec: 194,
    delayFormatted: '03m 14s delay',
    exactDelayText: '3 minutes 14 seconds',
    targetMet: true,
    isBackCatalog: false,
    ingestType: 'live',
    slaStatus: 'met',
    ingestMethod: 'RSS Feed',
    diffPayload: '+1.1KB Diff',
    diffAddedWords: 290,
    tags: ['Edge', 'Next.js', 'ISR', 'Performance'],
    threatRating: 'Medium',
    takeaways: [
      { label: 'Feature Launch', value: 'Streaming Incremental Static Regeneration (Streaming ISR)', type: 'launch' },
      { label: 'Market Threat', value: 'Further deepens developer lock-in for frontend edge rendering', type: 'threat' },
      { label: 'Perf Metric', value: 'Sub-30ms TTFB on heavily personalized ecommerce layouts', type: 'metric' }
    ],
    citations: [],
    domSelector: 'main article',
    analysis: {
      summary: 'Vercel launched Streaming ISR at the edge to blend static CDN caching with dynamic personalized hydration. The feature reduces TTFB to sub-30ms while sustaining high cache hit ratios.',
      threatRating: 'Medium',
      threatExplanation: 'Increases customer stickiness among web application developers evaluating edge hosting platforms.',
      takeaways: [
        'Blends static layout delivery with streaming edge hydration.',
        'Targets high-traffic retail and media sites with personalization.',
        'Maintains strong competitive moat around developer experience.'
      ],
      counterAction: 'Ensure our platform SDK highlights framework neutrality and seamless compatibility with streaming edge backends.',
      analyzedAt: '10:08:20 UTC',
      source: 'gemini-ai'
    }
  },
  {
    id: 'art-5',
    competitor: 'Datadog Engineering',
    competitorDomain: 'datadoghq.com',
    title: 'Detecting Silent Distributed Deadlocks in Kubernetes Meshes',
    snippet: 'Using eBPF kernel probes to trace asymmetric thread lock starvation across Envoy sidecar proxies in high-concurrency microservices.',
    content: `As microservice topologies expand into thousands of interacting services, silent deadlocks—where services do not crash but processing throughput drops to near-zero—have become a critical failure mode.

We demonstrate how low-overhead eBPF probes attached to Linux kernel schedulers can detect thread contention patterns across Envoy proxies before cascading cluster timeouts occur.`,
    author: 'Alexandre Eichenberger',
    readTime: '7 min read',
    url: 'https://www.datadoghq.com/blog/ebpf-deadlock-detection',
    canonicalUrl: 'https://www.datadoghq.com/blog/ebpf-deadlock-detection',
    publishedAt: '08:15:30 UTC',
    publishedDate: '2025-09-24T08:15:30.000Z',
    discoveredAt: '08:17:42 UTC',
    discoveredDate: '2025-09-24T08:17:42.000Z',
    publicationSource: 'Direct DOM Poller Discovery',
    delaySec: 132,
    delayFormatted: '02m 12s delay',
    exactDelayText: '2 minutes 12 seconds',
    targetMet: true,
    isBackCatalog: false,
    ingestType: 'live',
    slaStatus: 'met',
    ingestMethod: 'Direct DOM Poller',
    diffPayload: '+2.4KB Diff',
    diffAddedWords: 520,
    tags: ['eBPF', 'Kubernetes', 'Observability'],
    threatRating: 'Low',
    takeaways: [
      { label: 'Technology', value: 'eBPF-driven kernel thread contention tracing', type: 'launch' },
      { label: 'Market Threat', value: 'Solidifies Datadog depth in low-level infrastructure observability', type: 'threat' },
      { label: 'Efficiency', value: '< 0.5% CPU overhead on production nodes', type: 'metric' }
    ],
    citations: [],
    domSelector: 'div.blog-post-content',
    analysis: {
      summary: 'Datadog unveiled eBPF-powered kernel tracing to preempt silent distributed deadlocks in Envoy mesh sidecars with under 0.5% CPU overhead. It showcases deep low-level Linux systems monitoring.',
      threatRating: 'Low',
      threatExplanation: 'Reinforces Datadog enterprise depth without direct overlap with our immediate product focus.',
      takeaways: [
        'Utilizes eBPF to detect thread locks before cascading microservice failure.',
        'Less than 0.5% CPU overhead makes it deployable in high-load production.',
        'Appeals heavily to platform engineering leadership.'
      ],
      counterAction: 'Log into competitive intelligence database and tag for technical team review.',
      analyzedAt: '08:17:45 UTC',
      source: 'gemini-ai'
    }
  },
  {
    id: 'art-6',
    competitor: 'Snowflake Developers',
    competitorDomain: 'snowflake.com',
    title: 'Building Real-Time Analytical Pipelines with Dynamic Tables',
    snippet: 'Historical reference on declarative data transformations, automatic refresh schedules, and continuous streaming ingestion architecture.',
    content: `Dynamic Tables provide an automated, declarative way to define data transformation pipelines in Snowflake without manual orchestration or external workflow schedulers.

By specifying the target lag and SQL transformation logic, Snowflake continuously tracks changes across upstream base tables and materializes query results with ACID guarantees. This architectural pattern was adopted during the previous release cycle and is cataloged for historical benchmark continuity.`,
    author: 'Snowflake Core Engineering',
    readTime: '5 min read',
    url: 'https://www.snowflake.com/blog/dynamic-tables-ga',
    canonicalUrl: 'https://www.snowflake.com/blog/dynamic-tables-ga',
    publishedAt: '2 days ago (14:00:00 UTC)',
    publishedDate: '2025-09-22T14:00:00.000Z',
    discoveredAt: '14:00:00 UTC',
    discoveredDate: '2025-09-24T14:00:00.000Z',
    publicationSource: 'Sitemap <lastmod>',
    delaySec: 172800,
    delayFormatted: '2d 0h delay',
    exactDelayText: '2 days',
    targetMet: true, // Back-catalog items do not fail live SLA benchmarks
    isBackCatalog: true,
    ingestType: 'back-catalog',
    slaStatus: 'back-catalog',
    ingestMethod: 'XML Sitemap',
    diffPayload: '+4.2KB Diff',
    diffAddedWords: 680,
    tags: ['Snowflake', 'Dynamic Tables', 'Historical Archive'],
    threatRating: 'Medium',
    featuredImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    takeaways: [
      { label: 'Back-catalog Archive', value: 'Pre-existing historical post captured during baseline sitemap index sync', type: 'metric' },
      { label: 'SLA Isolation', value: 'Separated from live real-time SLA metrics to prevent false breach warnings', type: 'launch' }
    ],
    citations: [
      { text: 'Snowflake Documentation: Dynamic Tables', url: 'https://docs.snowflake.com' }
    ],
    domSelector: 'div.blog-post-content',
    analysis: {
      summary: 'Snowflake historical architecture guide detailing declarative dynamic tables and continuous incremental refresh schedules.',
      threatRating: 'Medium',
      threatExplanation: 'Core data platform feature establishing industry mindshare around automated SQL pipeline orchestration.',
      takeaways: [
        'Declarative data pipeline management directly within the data cloud.',
        'Continuous materialization without external orchestration tools.',
        'Historical baseline for enterprise table latency expectations.'
      ],
      counterAction: 'Reference in comparative data engineering whitepapers highlighting real-time stream processing superiority.',
      analyzedAt: '14:02:10 UTC',
      source: 'gemini-ai'
    }
  },
  {
    id: 'art-7',
    competitor: 'Stripe Engineering',
    competitorDomain: 'stripe.com',
    title: 'Designing Fault-Tolerant Distributed Webhooks at Global Scale',
    snippet: 'Historical architecture breakdown of Stripe webhook delivery infrastructure, idempotency key guarantees, and exponential backoff retry meshes.',
    content: `Delivering billions of mission-critical webhooks every day with near-zero packet loss requires resilient multi-region infrastructure and defensive software engineering.

In this retrospective engineering post, Stripe infra engineers explain the architecture behind idempotency keys, FIFO dead-letter queues, and dynamic TLS timeout management across partner endpoints.`,
    author: 'Stripe Infrastructure Team',
    readTime: '6 min read',
    url: 'https://stripe.com/blog/webhook-delivery-infrastructure',
    canonicalUrl: 'https://stripe.com/blog/webhook-delivery-infrastructure',
    publishedAt: '1 day ago (10:15:00 UTC)',
    publishedDate: '2025-09-23T10:15:00.000Z',
    discoveredAt: '10:15:00 UTC',
    discoveredDate: '2025-09-24T10:15:00.000Z',
    publicationSource: 'RSS <pubDate>',
    delaySec: 86400,
    delayFormatted: '1d 0h delay',
    exactDelayText: '1 day',
    targetMet: true,
    isBackCatalog: true,
    ingestType: 'back-catalog',
    slaStatus: 'back-catalog',
    ingestMethod: 'RSS Feed',
    diffPayload: '+3.8KB Diff',
    diffAddedWords: 740,
    tags: ['Webhooks', 'Idempotency', 'Historical Archive'],
    threatRating: 'Low',
    takeaways: [
      { label: 'Back-catalog Archive', value: 'Pre-existing article indexed during initial feed backfill', type: 'metric' },
      { label: 'SLA Isolation', value: 'Excluded from live 5-minute performance SLA calculation', type: 'launch' }
    ],
    citations: [
      { text: 'Stripe Webhooks API Reference', url: 'https://stripe.com/docs/webhooks' }
    ],
    domSelector: 'article.blog-post',
    analysis: {
      summary: 'Stripe retrospective on enterprise webhook delivery resilience, idempotency guarantees, and retry queuing.',
      threatRating: 'Low',
      threatExplanation: 'Educational systems architecture post establishing best practices for webhook reliability.',
      takeaways: [
        'Comprehensive discussion of idempotency keys in payment webhooks.',
        'Resilient multi-region message broker configuration.',
        'High relevance to webhook integration standards.'
      ],
      counterAction: 'Adopt recommended webhook signature headers in our notification integration dispatchers.',
      analyzedAt: '10:16:30 UTC',
      source: 'gemini-ai'
    }
  }
];

// Generate 100 enterprise site nodes for the 100-site matrix simulator
const DOMAIN_SEEDS = [
  'cloudflare.com', 'datadoghq.com', 'vercel.com', 'aws.amazon.com', 'stripe.com',
  'openai.com', 'anthropic.com', 'supabase.com', 'snowflake.com', 'hashicorp.com',
  'github.blog', 'linear.app', 'resend.com', 'neon.tech', 'upstash.com',
  'planetscale.com', 'render.com', 'fly.io', 'turso.tech', 'pinecone.io',
  'qdrant.tech', 'weaviate.io', 'chroma.run', 'modal.com', 'replicate.com',
  'postman.com', 'pagerduty.com', 'dynatrace.com', 'elastic.co', 'mongodb.com',
  'redis.io', 'temporal.io', 'launchdarkly.com', 'sentry.io', 'segment.com',
  'auth0.com', 'clerk.com', 'workos.com', 'incident.io', 'tailscale.com'
];

export const INITIAL_100_NODES: SiteNode[] = Array.from({ length: 100 }).map((_, i) => {
  const seed = DOMAIN_SEEDS[i % DOMAIN_SEEDS.length];
  const domain = i < DOMAIN_SEEDS.length ? seed : `target-${i + 1}.${seed}`;
  const isBackoff = i === 18 || i === 64; // exactly 2 in backoff
  const isPolling = i === 3 || i === 27 || i === 52 || i === 81; // 4 in-flight polling
  const isOffline = i === 94; // 1 offline node

  let status: 'nominal' | 'polling' | 'backoff' | 'offline' = 'nominal';
  if (isBackoff) status = 'backoff';
  else if (isPolling) status = 'polling';
  else if (isOffline) status = 'offline';

  const strategies: ('Hybrid RSS+Sitemap' | 'Sitemap Index' | 'Direct DOM Poller' | 'RSS Stream')[] = [
    'Hybrid RSS+Sitemap',
    'Sitemap Index',
    'Direct DOM Poller',
    'RSS Stream'
  ];

  const strategy = strategies[i % strategies.length];
  const latency = isOffline ? 0 : isBackoff ? 4800 : Math.floor(120 + ((i * 19) % 380));

  return {
    id: i + 1,
    name: domain.replace('.com', '').replace('.tech', '').replace('.io', '').replace('.app', '').replace('.co', ''),
    domain,
    status,
    strategy,
    latencyMs: latency,
    lastPolledSecAgo: isPolling ? 1 : Math.floor(10 + ((i * 7) % 180)),
    nextPollInSec: isPolling ? 0 : Math.floor(5 + ((i * 11) % 60)),
    etag: `W/"${((i + 1) * 314159).toString(16).slice(0, 8)}"`,
    statusCode: isOffline ? 504 : isBackoff ? 429 : 200,
    region: i % 3 === 0 ? 'us-east-1' : i % 3 === 1 ? 'eu-central-1' : 'ap-southeast-1',
    articlesCount: 12 + ((i * 17) % 350)
  };
});

export const INITIAL_LOGS: TelemetryLog[] = [
  {
    id: 'log-1',
    timestamp: '14:26:02.194',
    level: 'info',
    source: 'worker-us-east-04c',
    message: 'Dispatched GET /category/enterprise/feed/ to techcrunch.com (HTTP/2 TLS 1.3)',
    durationMs: 142
  },
  {
    id: 'log-2',
    timestamp: '14:26:01.810',
    level: 'success',
    source: 'worker-us-east-02a',
    message: 'ETag match W/"7a8b9c1d" on cloudflare.com - 304 Not Modified (0 bytes transferred)',
    durationMs: 44
  },
  {
    id: 'log-3',
    timestamp: '14:25:58.420',
    level: 'warn',
    source: 'scheduler-main',
    message: 'Rate throttle advisory for api.segment.com/blog: applying jitter +12.4s',
    durationMs: 12
  },
  {
    id: 'log-4',
    timestamp: '14:25:52.019',
    level: 'info',
    source: 'extractor-pool-01',
    message: 'Extracted semantic DOM tree for "Next-Gen Edge Inference" (1,842 tokens vectorized)',
    durationMs: 290
  },
  {
    id: 'log-5',
    timestamp: '14:25:48.112',
    level: 'success',
    source: 'gemini-pipeline',
    message: 'Gemini AI intelligence analysis generated threat score: High (SLA delay: 3m 12s)',
    durationMs: 680
  }
];

export const INITIAL_RETRIES: RetryEvent[] = [
  {
    id: 'ret-1',
    timestamp: '14:22:10',
    domain: 'hashicorp.com/blog',
    error: '429 Too Many Requests (Cloudflare WAF rate limiter)',
    code: 429,
    attempt: 2,
    maxAttempts: 4,
    resolution: 'Backoff',
    backoffDelay: '30s exponential'
  },
  {
    id: 'ret-2',
    timestamp: '14:19:44',
    domain: 'target-18.neon.tech/blog',
    error: '503 Service Unavailable (Origin capacity overloaded)',
    code: 503,
    attempt: 3,
    maxAttempts: 5,
    resolution: 'Backoff',
    backoffDelay: '60s jitter'
  },
  {
    id: 'ret-3',
    timestamp: '14:15:02',
    domain: 'datadoghq.com/blog',
    error: 'ETIMEDOUT: Connection reset by peer during TLS handshake',
    code: 504,
    attempt: 1,
    maxAttempts: 3,
    resolution: 'Recovered',
    backoffDelay: 'Resolved on retry 2'
  }
];

export const INITIAL_MONITORING_CHECKS: MonitoringCheck[] = [
  {
    id: 'chk-1',
    timestamp: '14:29:48.120',
    competitorId: 'comp-1',
    competitorName: 'TechCrunch Enterprise',
    domain: 'techcrunch.com',
    strategy: 'Hybrid RSS+Sitemap',
    statusCode: 200,
    statusResponse: '200 OK (1 new article detected)',
    durationMs: 192,
    outcome: 'success',
    articlesDetected: 1,
    recoveryAction: 'Real-time alerts & database synchronization complete'
  },
  {
    id: 'chk-2',
    timestamp: '14:29:45.310',
    competitorId: 'comp-2',
    competitorName: 'Cloudflare Engineering',
    domain: 'blog.cloudflare.com',
    strategy: 'Hybrid RSS+Sitemap',
    statusCode: 304,
    statusResponse: '304 Not Modified (Cache Validated)',
    durationMs: 44,
    outcome: 'cached',
    articlesDetected: 0,
    recoveryAction: 'Zero bandwidth consumed - ETag validator active'
  },
  {
    id: 'chk-3',
    timestamp: '14:29:40.015',
    competitorId: 'comp-3',
    competitorName: 'Datadog Tech Blog',
    domain: 'datadoghq.com',
    strategy: 'RSS Stream',
    statusCode: 504,
    statusResponse: '504 Gateway Timeout (Network Dropout)',
    durationMs: 8012,
    outcome: 'error',
    articlesDetected: 0,
    error: 'ETIMEDOUT: Connection dropped during origin socket handshake (8000ms threshold)',
    recoveryAction: 'Graceful dropout recovery: Cached state preserved, non-blocking retry queued with exponential jitter'
  },
  {
    id: 'chk-4',
    timestamp: '14:29:32.480',
    competitorId: 'comp-4',
    competitorName: 'The Verge',
    domain: 'theverge.com',
    strategy: 'RSS Stream',
    statusCode: 200,
    statusResponse: '200 OK (Feed nominal - 0 new posts)',
    durationMs: 118,
    outcome: 'success',
    articlesDetected: 0,
    recoveryAction: 'Nominal polling cycle completed'
  },
  {
    id: 'chk-5',
    timestamp: '14:29:28.910',
    competitorId: 'comp-5',
    competitorName: 'HashiCorp Blog',
    domain: 'hashicorp.com',
    strategy: 'Direct DOM Poller',
    statusCode: 403,
    statusResponse: '403 Forbidden (Anti-Bot Challenge)',
    durationMs: 210,
    outcome: 'error',
    articlesDetected: 0,
    error: 'Cloudflare Ray ID challenge encountered on direct feed endpoint',
    recoveryAction: 'Bypassed via Direct DOM Poller with browser emulation headers'
  },
  {
    id: 'chk-6',
    timestamp: '14:29:20.150',
    competitorId: 'comp-6',
    competitorName: 'Vercel Engineering',
    domain: 'vercel.com',
    strategy: 'Sitemap Index',
    statusCode: 304,
    statusResponse: '304 Not Modified (Cache Validated)',
    durationMs: 52,
    outcome: 'cached',
    articlesDetected: 0,
    recoveryAction: 'Zero bandwidth consumed - ETag validator active'
  },
  {
    id: 'chk-7',
    timestamp: '14:29:14.620',
    competitorId: 'comp-7',
    competitorName: 'Neon Tech',
    domain: 'neon.tech',
    strategy: 'Hybrid RSS+Sitemap',
    statusCode: 500,
    statusResponse: '500 Internal Server Error (Origin Failure)',
    durationMs: 385,
    outcome: 'error',
    articlesDetected: 0,
    error: 'HTTP 500: Internal server error on origin host feed controller',
    recoveryAction: 'Preserved uptime: Target isolated and rescheduled for next cycle without interrupting active worker pool'
  },
  {
    id: 'chk-8',
    timestamp: '14:29:08.340',
    competitorId: 'comp-8',
    competitorName: 'Snowflake Developers',
    domain: 'snowflake.com',
    strategy: 'Sitemap Index',
    statusCode: 200,
    statusResponse: '200 OK (Sitemap indexed - 1 back-catalog item)',
    durationMs: 280,
    outcome: 'success',
    articlesDetected: 1,
    recoveryAction: 'Historical archive item isolated from live 5m SLA calculations'
  }
];
