import { NextRequest, NextResponse } from 'next/server';
import { createModel, getAllModels, getModelImages, getModelAccountMappingsForModels } from '@/lib/db';

interface Model {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
}

// GET /api/models - List all models with image counts and linked platforms
export async function GET() {
  try {
    const models = await getAllModels();
    const modelIds = models.map((m: Model) => m.id);

    // Fetch images + account mappings in parallel
    const [imageCounts, accountMappings] = await Promise.all([
      Promise.all(models.map(async (model: Model) => {
        const images = await getModelImages(model.id);
        return { id: model.id, count: images.length };
      })),
      modelIds.length > 0 ? getModelAccountMappingsForModels(modelIds) : [],
    ]);

    // Build lookup maps
    const imageCountMap = new Map(imageCounts.map((ic: { id: string; count: number }) => [ic.id, ic.count]));
    const platformsMap = new Map<string, string[]>();
    for (const mapping of accountMappings as { modelId: string; platform: string }[]) {
      const existing = platformsMap.get(mapping.modelId) || [];
      if (!existing.includes(mapping.platform)) existing.push(mapping.platform);
      platformsMap.set(mapping.modelId, existing);
    }

    const modelsWithCounts = models.map((model: Model) => ({
      ...model,
      imageCount: imageCountMap.get(model.id) || 0,
      linkedPlatforms: platformsMap.get(model.id) || [],
    }));

    return NextResponse.json(modelsWithCounts);
  } catch (err) {
    console.error('Get models error:', err);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}

// POST /api/models - Create a new model
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body as { name?: string; description?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }

    const model = await createModel({
      name: name.trim(),
      description: description?.trim() || null,
      avatarUrl: null,
    });

    return NextResponse.json(model, { status: 201 });
  } catch (err) {
    console.error('Create model error:', err);
    return NextResponse.json({ error: 'Failed to create model' }, { status: 500 });
  }
}
