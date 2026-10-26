<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_access_dashboard(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Usuario Demo',
            'email' => 'demo@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $this->withToken($response->json('token'))
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure(['invoices', 'orders', 'tickets', 'agents']);
    }

    public function test_support_works_without_external_ai(): void
    {
        $this->postJson('/api/support/chat', ['message' => 'Quiero consultar PED-1001'])
            ->assertOk()
            ->assertJsonStructure(['message', 'context', 'session_id']);
    }
}
