from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class APIKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
