import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Users ──────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.string('id', 36).primary();
    t.string('username', 32).unique().notNullable();
    t.string('normalized_username', 32).unique().notNullable();
    t.string('display_name', 48).notNullable();
    t.string('password_hash', 255).nullable();
    t.string('email', 255).nullable();
    t.enum('status', ['active', 'suspended', 'banned', 'deleted']).defaultTo('active');
    t.enum('role', ['player', 'moderator', 'admin']).defaultTo('player');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());

    t.index('normalized_username');
    t.index('status');
  });

  // ── Guest Sessions ─────────────────────────────────────────
  await knex.schema.createTable('guest_sessions', (t) => {
    t.string('id', 36).primary();
    t.string('token_hash', 255).notNullable().unique();
    t.string('display_name', 48).notNullable();
    t.string('avatar', 255).nullable();
    t.string('color', 7).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('expires_at').notNullable();
    t.string('claimed_by_user_id', 36).nullable()
      .references('id').inTable('users').onDelete('SET NULL');

    t.index('token_hash');
    t.index('expires_at');
  });

  // ── Sessions (auth tokens) ─────────────────────────────────
  await knex.schema.createTable('sessions', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36).nullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.string('guest_session_id', 36).nullable()
      .references('id').inTable('guest_sessions').onDelete('CASCADE');
    t.string('token_hash', 255).notNullable().unique();
    t.string('socket_id', 255).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at').nullable();

    t.index('token_hash');
    t.index('user_id');
    t.index('guest_session_id');
  });

  // ── Profiles ───────────────────────────────────────────────
  await knex.schema.createTable('profiles', (t) => {
    t.string('user_id', 36).primary()
      .references('id').inTable('users').onDelete('CASCADE');
    t.string('avatar', 255).nullable();
    t.string('profile_color', 7).defaultTo('#00ff88');
    t.text('bio').nullable();
    t.integer('xp').unsigned().defaultTo(0);
    t.integer('level').unsigned().defaultTo(1);
    t.json('privacy_settings').nullable();
    t.json('stats').nullable();
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ── Rooms ──────────────────────────────────────────────────
  await knex.schema.createTable('rooms', (t) => {
    t.string('id', 36).primary();
    t.string('join_code', 8).unique().notNullable();
    t.string('host_session_id', 36).notNullable();
    t.enum('visibility', ['private', 'public']).defaultTo('private');
    t.enum('status', ['open', 'in_game', 'closed']).defaultTo('open');
    t.json('settings').notNullable();
    t.integer('settings_version').unsigned().defaultTo(1);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.timestamp('expires_at').nullable();

    t.index('join_code');
    t.index('status');
    t.index('visibility');
  });

  // ── Room Members ───────────────────────────────────────────
  await knex.schema.createTable('room_members', (t) => {
    t.string('id', 36).primary();
    t.string('room_id', 36).notNullable()
      .references('id').inTable('rooms').onDelete('CASCADE');
    t.string('session_id', 36).notNullable();
    t.string('display_name', 48).notNullable();
    t.string('avatar', 255).nullable();
    t.string('color', 7).nullable();
    t.enum('role', ['host', 'player', 'spectator']).defaultTo('player');
    t.enum('connection_status', ['connected', 'disconnected', 'reconnecting']).defaultTo('connected');
    t.boolean('is_ready').defaultTo(false);
    t.string('team_id', 36).nullable();
    t.integer('score').defaultTo(0);
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.timestamp('left_at').nullable();

    t.unique(['room_id', 'session_id']);
    t.index('room_id');
    t.index('session_id');
  });

  // ── Teams ──────────────────────────────────────────────────
  await knex.schema.createTable('teams', (t) => {
    t.string('id', 36).primary();
    t.string('room_id', 36).notNullable()
      .references('id').inTable('rooms').onDelete('CASCADE');
    t.string('name', 32).notNullable();
    t.string('color', 7).notNullable();
    t.string('captain_id', 36).nullable();
    t.integer('score').defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index('room_id');
  });

  // ── Questions ──────────────────────────────────────────────
  await knex.schema.createTable('questions', (t) => {
    t.string('id', 36).primary();
    t.integer('current_version').unsigned().defaultTo(1);
    t.enum('source_type', ['builtin', 'ai_generated', 'host_custom', 'imported']).notNullable();
    t.enum('status', ['draft', 'pending_review', 'approved', 'rejected', 'retired', 'emergency_disabled']).defaultTo('approved');
    t.string('category', 32).notNullable();
    t.enum('difficulty', ['easy', 'medium', 'hard']).notNullable();
    t.string('language', 5).defaultTo('en');
    t.string('duplicate_fingerprint', 255).nullable();
    t.string('created_by', 36).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());

    t.index('status');
    t.index('category');
    t.index('difficulty');
    t.index('language');
    t.index('duplicate_fingerprint');
  });

  // ── Question Versions ──────────────────────────────────────
  await knex.schema.createTable('question_versions', (t) => {
    t.string('id', 36).primary();
    t.string('question_id', 36).notNullable()
      .references('id').inTable('questions').onDelete('CASCADE');
    t.integer('version_number').unsigned().notNullable();
    t.text('question_text').notNullable();
    t.string('canonical_answer', 500).notNullable();
    t.json('accepted_aliases').nullable();
    t.text('explanation').nullable();
    t.json('source_references').nullable();
    t.json('validation_metadata').nullable();
    t.string('reviewed_by', 36).nullable();
    t.text('review_notes').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.unique(['question_id', 'version_number']);
    t.index('question_id');
  });

  // ── Matches ────────────────────────────────────────────────
  await knex.schema.createTable('matches', (t) => {
    t.string('id', 36).primary();
    t.string('room_id', 36).notNullable()
      .references('id').inTable('rooms').onDelete('CASCADE');
    t.enum('format', ['fixed_questions', 'timed', 'target_score']).notNullable();
    t.enum('status', ['preparing', 'active', 'paused', 'completed', 'cancelled']).defaultTo('preparing');
    t.json('rules_snapshot').notNullable();
    t.integer('question_count').unsigned().defaultTo(0);
    t.string('language', 5).defaultTo('en');
    t.integer('state_version').unsigned().defaultTo(0);
    t.timestamp('started_at').nullable();
    t.timestamp('ended_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index('room_id');
    t.index('status');
  });

  // ── Match Participants ─────────────────────────────────────
  await knex.schema.createTable('match_participants', (t) => {
    t.string('id', 36).primary();
    t.string('match_id', 36).notNullable()
      .references('id').inTable('matches').onDelete('CASCADE');
    t.string('member_id', 36).notNullable();
    t.string('session_id', 36).notNullable();
    t.string('display_name', 48).notNullable();
    t.string('team_id', 36).nullable();
    t.integer('final_score').defaultTo(0);
    t.integer('rank').nullable();
    t.integer('correct_answers').unsigned().defaultTo(0);
    t.integer('incorrect_answers').unsigned().defaultTo(0);
    t.integer('timeouts').unsigned().defaultTo(0);
    t.float('avg_buzz_time').nullable();
    t.float('fastest_buzz').nullable();
    t.json('stats_snapshot').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.unique(['match_id', 'member_id']);
    t.index('match_id');
    t.index('session_id');
  });

  // ── Match Questions ────────────────────────────────────────
  await knex.schema.createTable('match_questions', (t) => {
    t.string('id', 36).primary();
    t.string('match_id', 36).notNullable()
      .references('id').inTable('matches').onDelete('CASCADE');
    t.string('question_id', 36).notNullable()
      .references('id').inTable('questions').onDelete('RESTRICT');
    t.integer('question_version').unsigned().notNullable();
    t.integer('order_index').unsigned().notNullable();
    t.enum('state', ['pending', 'buzz_open', 'answer_turn', 'judging', 'revealed', 'completed', 'cancelled', 'skipped']).defaultTo('pending');
    t.json('selected_rules').nullable();
    t.timestamp('started_at').nullable();
    t.timestamp('buzz_deadline').nullable();
    t.timestamp('ended_at').nullable();

    t.unique(['match_id', 'order_index']);
    t.index('match_id');
    t.index('question_id');
  });

  // ── Buzzer Events ──────────────────────────────────────────
  await knex.schema.createTable('buzzer_events', (t) => {
    t.string('id', 36).primary();
    t.string('match_question_id', 36).notNullable()
      .references('id').inTable('match_questions').onDelete('CASCADE');
    t.string('player_id', 36).notNullable();
    t.string('session_id', 36).notNullable();
    t.integer('server_sequence').unsigned().notNullable();
    t.bigInteger('server_received_at').notNullable(); // high-precision timestamp
    t.enum('acceptance', ['accepted', 'rejected_ineligible', 'rejected_late', 'rejected_duplicate', 'rejected_phase', 'rejected_rate_limit']).notNullable();
    t.integer('tie_group').unsigned().nullable();
    t.integer('tie_order').unsigned().nullable();
    t.string('rejection_reason', 255).nullable();
    t.string('idempotency_key', 64).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index('match_question_id');
    t.index('player_id');
    t.index(['match_question_id', 'idempotency_key']);
  });

  // ── Answer Submissions ─────────────────────────────────────
  await knex.schema.createTable('answer_submissions', (t) => {
    t.string('id', 36).primary();
    t.string('match_question_id', 36).notNullable()
      .references('id').inTable('match_questions').onDelete('CASCADE');
    t.string('player_id', 36).notNullable();
    t.string('session_id', 36).notNullable();
    t.string('answer_text', 500).notNullable();
    t.string('normalized_answer', 500).nullable();
    t.bigInteger('received_at').notNullable();
    t.enum('result', ['correct', 'incorrect', 'timeout', 'pending']).defaultTo('pending');
    t.enum('judging_mode', ['automatic', 'manual', 'hybrid']).notNullable();
    t.string('judged_by', 36).nullable();
    t.string('reason', 255).nullable();
    t.string('idempotency_key', 64).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index('match_question_id');
    t.index('player_id');
  });

  // ── Score Events ───────────────────────────────────────────
  await knex.schema.createTable('score_events', (t) => {
    t.string('id', 36).primary();
    t.string('match_id', 36).notNullable()
      .references('id').inTable('matches').onDelete('CASCADE');
    t.string('match_question_id', 36).nullable()
      .references('id').inTable('match_questions').onDelete('SET NULL');
    t.string('participant_id', 36).notNullable();
    t.integer('delta').notNullable();
    t.string('reason', 255).notNullable();
    t.string('actor', 36).nullable();
    t.string('idempotency_key', 64).notNullable();
    t.boolean('reversed').defaultTo(false);
    t.string('reversed_by_event_id', 36).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.unique('idempotency_key');
    t.index('match_id');
    t.index('participant_id');
  });

  // ── Disputes ───────────────────────────────────────────────
  await knex.schema.createTable('disputes', (t) => {
    t.string('id', 36).primary();
    t.string('match_id', 36).notNullable()
      .references('id').inTable('matches').onDelete('CASCADE');
    t.string('match_question_id', 36).nullable()
      .references('id').inTable('match_questions').onDelete('SET NULL');
    t.string('requester_id', 36).notNullable();
    t.string('requester_name', 48).notNullable();
    t.enum('type', ['buzzer_order', 'answer_judgment', 'question_content', 'score_error']).notNullable();
    t.text('description').notNullable();
    t.enum('status', ['open', 'under_review', 'upheld', 'overridden', 'dismissed']).defaultTo('open');
    t.json('evidence').nullable();
    t.text('resolution').nullable();
    t.string('resolved_by', 36).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('resolved_at').nullable();

    t.index('match_id');
    t.index('requester_id');
    t.index('status');
  });

  // ── Audit Logs ─────────────────────────────────────────────
  await knex.schema.createTable('audit_logs', (t) => {
    t.string('id', 36).primary();
    t.string('action', 64).notNullable();
    t.string('actor_id', 36).notNullable();
    t.string('actor_name', 48).notNullable();
    t.string('target_id', 36).nullable();
    t.text('reason').nullable();
    t.json('before_state').nullable();
    t.json('after_state').nullable();
    t.string('match_id', 36).nullable();
    t.string('room_id', 36).nullable();
    t.string('correlation_id', 36).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index('action');
    t.index('actor_id');
    t.index('room_id');
    t.index('match_id');
    t.index('correlation_id');
  });

  // ── Match Events (general event log) ───────────────────────
  await knex.schema.createTable('match_events', (t) => {
    t.string('id', 36).primary();
    t.string('match_id', 36).notNullable()
      .references('id').inTable('matches').onDelete('CASCADE');
    t.string('event_type', 64).notNullable();
    t.string('actor_id', 36).nullable();
    t.bigInteger('server_timestamp').notNullable();
    t.integer('state_version').unsigned().notNullable();
    t.json('metadata').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index('match_id');
    t.index('event_type');
  });

  // ── Question Reports ───────────────────────────────────────
  await knex.schema.createTable('question_reports', (t) => {
    t.string('id', 36).primary();
    t.string('question_id', 36).notNullable()
      .references('id').inTable('questions').onDelete('CASCADE');
    t.integer('question_version').unsigned().nullable();
    t.string('reporter_id', 36).notNullable();
    t.enum('category', ['incorrect_answer', 'ambiguous', 'duplicate', 'offensive', 'other']).notNullable();
    t.text('description').nullable();
    t.enum('status', ['open', 'reviewed', 'resolved', 'dismissed']).defaultTo('open');
    t.text('resolution').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('resolved_at').nullable();

    t.index('question_id');
    t.index('status');
  });

  // ── Friend Requests ────────────────────────────────────────
  await knex.schema.createTable('friend_requests', (t) => {
    t.string('id', 36).primary();
    t.string('requester_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.string('recipient_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.enum('status', ['pending', 'accepted', 'declined']).defaultTo('pending');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());

    t.unique(['requester_id', 'recipient_id']);
  });

  // ── Friendships ────────────────────────────────────────────
  await knex.schema.createTable('friendships', (t) => {
    t.string('user_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.string('friend_user_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.primary(['user_id', 'friend_user_id']);
  });

  // ── User Blocks ────────────────────────────────────────────
  await knex.schema.createTable('user_blocks', (t) => {
    t.string('blocker_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.string('blocked_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.primary(['blocker_id', 'blocked_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'user_blocks', 'friendships', 'friend_requests',
    'question_reports', 'match_events', 'audit_logs',
    'disputes', 'score_events', 'answer_submissions',
    'buzzer_events', 'match_questions', 'match_participants',
    'matches', 'teams', 'room_members', 'rooms',
    'question_versions', 'questions', 'profiles',
    'sessions', 'guest_sessions', 'users',
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
