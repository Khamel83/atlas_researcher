# Atlas Researcher - Multi-Agent AI Research System

A sophisticated research platform that uses multiple AI agents to conduct comprehensive, evidence-based research on any topic. Atlas Researcher leverages OpenRouter's free AI models to analyze sources, evaluate credibility, and generate detailed research reports with citations.

## Features

### 🔬 Multi-Agent Research Pipeline
- **Planner Agent**: Breaks down complex questions into specific research subtopics
- **Searcher Agent**: Finds relevant sources using web search APIs
- **Evaluator Agent**: Assesses source credibility and extracts key information
- **Synthesizer Agent**: Generates comprehensive research reports with proper citations

### 💾 Progressive Saving & Resume
- **Auto-save**: Research progress is saved every 30 seconds
- **Session Management**: Resume interrupted research from where you left off
- **Browser Timeout Protection**: No more lost research due to browser timeouts
- **Phase-based Recovery**: Resume from any phase (planning, searching, evaluation, synthesis)

### 📊 Research Depth Modes
- **Normal Mode**: 10 sources per subtopic for quick, focused research
- **Max Mode**: 30+ sources per subtopic for comprehensive, in-depth analysis
- **Smart Filtering**: High-quality content filtering based on relevance and credibility

### 🎯 Smart Features
- **Source Credibility Assessment**: Automatic evaluation of source reliability
- **Citation-Ready Reports**: Properly formatted citations and references
- **Model Fallback System**: Automatic model switching for reliability
- **Real-time Progress Updates**: Live streaming of research progress

## Technology Stack

- **Frontend**: Next.js 15.5.4 with TypeScript and Turbopack
- **AI Integration**: OpenRouter API with free models
- **Web Search**: Perplexity Search API for source discovery
- **Streaming**: Server-Sent Events (SSE) for real-time updates
- **Storage**: Session-based progressive saving with Vercel report storage
- **Deployment**: Caddy reverse proxy with optimized headers

## Getting Started

### Prerequisites
- Node.js 18+
- OpenRouter API key (configured server-side)
- Perplexity API key for web search (configured server-side)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd atlas_researcher
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## Configuration

### Environment Variables
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `PERPLEXITY_API_KEY`: Your Perplexity API key (for web search)

### Model Configuration
The system uses OpenRouter's free models with automatic fallback:
- **Primary**: `google/gemini-2.5-flash-preview-09-2025`
- **Reasoning**: `meta-llama/llama-3.1-70b-instruct:free`
- **Synthesis**: `meta-llama/llama-3.1-70b-instruct:free`

## Usage

1. **Enter Research Question**: Provide a detailed research question (minimum 10 characters)
2. **Select Research Depth**: Choose Normal (10 sources) or Max (30+ sources) mode
3. **Start Research**: The multi-agent pipeline will automatically:
   - Plan the research strategy
   - Search for relevant sources
   - Evaluate source credibility
   - Generate a comprehensive report
4. **View Results**: Access your research report with citations and metadata

## API Endpoints

### Research Pipeline
- `POST /api/research` - Start new research or resume existing session
- `PUT /api/research` - Get session status
- `DELETE /api/research` - Delete session

### Session Management
Research sessions are automatically managed with:
- 30-second auto-save intervals
- 1-hour session expiration
- Automatic cleanup of expired sessions

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes     │    │   AI Agents     │
│   (Next.js)     │◄──►│   (/api/research) │◄──►│   - Planner     │
│                 │    │                  │    │   - Searcher    │
│ - Research Form │    │ - Session Mgmt   │    │   - Evaluator   │
│ - Progress      │    │ - Streaming      │    │   - Synthesizer │
│ - Reports       │    │ - Error Handling │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the [GitHub Issues](https://github.com/your-repo/atlas-researcher/issues)
- Review the documentation in the `/docs` directory
- Contact the development team
