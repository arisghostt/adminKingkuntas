import { NextResponse } from 'next/server';
import { categories } from '../data';

// GET /api/categories/[id] - Get a single category
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const category = categories.find(c => c.id === id);
  
  if (!category) {
    return NextResponse.json({
      success: false,
      message: 'Category not found',
    }, { status: 404 });
  }
  
  return NextResponse.json({
    success: true,
    data: category,
  });
}

// PUT /api/categories/[id] - Update a category
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const categoryIndex = categories.findIndex(c => c.id === id);
    
    if (categoryIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Category not found',
      }, { status: 404 });
    }
    
    categories[categoryIndex] = {
      ...categories[categoryIndex],
      name: body.name || categories[categoryIndex].name,
      description: body.description ?? categories[categoryIndex].description,
      updatedAt: new Date().toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      data: categories[categoryIndex],
      message: 'Category updated successfully',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to update category',
    }, { status: 400 });
  }
}

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryIndex = categories.findIndex(c => c.id === id);
    
    if (categoryIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Category not found',
      }, { status: 404 });
    }
    
    categories.splice(categoryIndex, 1);
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to delete category',
    }, { status: 400 });
  }
}
