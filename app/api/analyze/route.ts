import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Save file temporarily
    const tempDir = path.join(process.cwd(), '.tmp');
    await fs.mkdir(tempDir, { recursive: true });

    const filename = `${Date.now()}_${file.name}`;
    const filepath = path.join(tempDir, filename);
    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

    // Run analyze.py
    let garmentData: any = null;
    try {
      const { stdout } = await execAsync(`python3 scripts/analyze.py "${filepath}"`, {
        cwd: process.cwd(),
        timeout: 10000,
      });

      // Extract JSON from stdout
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        garmentData = JSON.parse(jsonMatch[0]);
      }
    } catch (err: any) {
      console.warn('Error running analyze.py:', err.message);
      // Fallback to basic analysis
      garmentData = {
        name: file.name.split('.')[0],
        category: 'top',
        primary_color: 'unknown',
        color: 'unknown',
        pattern: 'solid',
        fit_type: 'regular',
        season: 'all-season',
        style: 'casual',
        material: 'unknown',
        image_path: filepath,
        notes: 'Auto-detected from upload',
      };
    }

    // Upload to Supabase
    const { data, error } = await supabase
      .from('garments')
      .insert([{
        name: garmentData.name || file.name,
        category: garmentData.category || 'top',
        primary_color: garmentData.primary_color || 'unknown',
        color: garmentData.color || 'unknown',
        pattern: garmentData.pattern || 'solid',
        fit_type: garmentData.fit_type || 'regular',
        season: garmentData.season || 'all-season',
        style: garmentData.style || 'casual',
        material: garmentData.material || 'unknown',
        image_path: filepath,
        analysis_status: 'completed',
        notes: garmentData.notes || `Uploaded: ${new Date().toISOString()}`,
      }])
      .select();

    // Cleanup temp file
    try {
      await fs.unlink(filepath);
    } catch {
      // ignore
    }

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      garment: data?.[0],
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
