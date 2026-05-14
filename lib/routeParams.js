import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

export function isValidObjectId(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(value) &&
    mongoose.Types.ObjectId.isValid(value)
  )
}

export function invalidIdResponse(name = 'id') {
  return NextResponse.json(
    { error: `Invalid ${name}` },
    { status: 400 },
  )
}
