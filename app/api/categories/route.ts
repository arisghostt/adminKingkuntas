import { NextResponse } from 'next/server';
import { categories, type Category } from './data';

// GET /api/categories - List all categories
export async function GET() {
  return NextResponse.json({
    success: true,
    data: categories,
  });
}

// POST /api/categories - Create a new category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newCategory: Category = {
      id: String(Date.now()),
      name: body.name,
      description: body.description || '',
      productCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    categories.push(newCategory);
    
    return NextResponse.json({
      success: true,
      data: newCategory,
      message: 'Category created successfully',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to create category',
    }, { status: 400 });
  }
}
