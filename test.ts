    UPDATE plan_ai_usage_prices
    SET credits_per_usd = 4000, min_credit_charge = 0.01, web_search_cost_usd = 0.008
    WHERE id = '01a00680-e98c-74eb-a00b-381682e5ea87'; -- basic
  
    UPDATE plan_ai_usage_prices
    SET credits_per_usd = 4000, min_credit_charge = 0.01, web_search_cost_usd = 0.008
    WHERE id = '01a00680-ffa2-754c-a68b-ae0db90390c5'; -- plus

    ----

        UPDATE agent_runtime_config
    SET
      agent_config = '{
        "reasoning": {"effort": "medium"},
        "models": [{
          "priority": 0,
          "provider": "deepseek",
          "model": "@openrouter-2/~deepseek/deepseek-v4-flash-latest",
          "temperature": 0.2,
          "max_tokens": 30720,
          "pricing": {"input_tokens": 9e-8, "output_tokens": 1.8e-7}
        }]
      }'::jsonb,
      compaction_config = '{
        "enabled": true,
        "threshold_tokens": 300000,
        "reasoning": {"effort": "low"},
        "models": [{
          "priority": 0,
          "provider": "deepseek",
          "model": "@openrouter-2/~deepseek/deepseek-v4-flash-latest",
          "temperature": 0.2,
          "max_tokens": 10240,
          "pricing": {"input_tokens": 9e-8, "output_tokens": 1.8e-7}
        }]
      }'::jsonb
    WHERE id = '01a00681-1989-7618-aa2f-d04659cfd41b'; 