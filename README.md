# Project Architecture

```text
                         ┌─────────────────┐
                         │  Mobile Client  │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   API Gateway   │
                         └────────┬────────┘
                                  │
            ┌─────────────────────┼──────────────────────┐
            │                     │                      │
            ▼                     ▼                      ▼
       ┌───────────┐       ┌────────────┐        ┌────────────┐
       │   Auth    │       │  Customer  │        │  Account   │
       │  Service  │       │  Service   │        │  Service   │
       └───────────┘       └────────────┘        └──────┬─────┘
                                                        │
                                                        │
                                                        ▼
                                                ┌────────────┐
                                                │  Transfer  │
                                                │  Service   │
                                                └──────┬─────┘
                                                       │
                                                       │ Kafka
                                                       ▼
                                                ┌────────────┐
                                                │   Ledger   │
                                                │  Service   │
                                                └────────────┘

                    DATABASES

       auth_db ──────── Auth
       customer_db ──── Customer
       account_db ────── Account
       transfer_db ───── Transfer
       ledger_db ─────── Ledger
```

## Core goal

```text
Authentication
      +
Customer Management
      +
Bank Accounts
      +
Money Transfers
      +
Kafka
      +
Idempotency
      +
Double-Entry Ledger
      +
Distributed Microservices
```