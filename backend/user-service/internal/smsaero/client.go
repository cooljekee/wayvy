package smsaero

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	email   string
	apiKey  string
	baseURL string
	http    *http.Client
}

func New(email, apiKey string) *Client {
	return &Client{
		email:   email,
		apiKey:  apiKey,
		baseURL: "https://gate.smsaero.ru/v2/",
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

// newWithBaseURL используется только в тестах
func newWithBaseURL(email, apiKey, baseURL string) *Client {
	c := New(email, apiKey)
	c.baseURL = baseURL
	return c
}

type sendRequest struct {
	Number string `json:"number"`
	Text   string `json:"text"`
	Sign   string `json:"sign"`
}

type sendResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// SendOTP отправляет 4-значный код на номер phone (E.164, например +79161234567).
// SMSAero принимает номер без +: strip перед отправкой.
func (c *Client) SendOTP(ctx context.Context, phone, code string) error {
	number := strings.TrimPrefix(phone, "+")

	body, err := json.Marshal(sendRequest{
		Number: number,
		Text:   fmt.Sprintf("Код Wayvy: %s", code),
		Sign:   "SMS Aero",
	})
	if err != nil {
		return fmt.Errorf("smsaero marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"sms/send", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("smsaero new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(c.email, c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("smsaero do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("smsaero unexpected status %d", resp.StatusCode)
	}

	var result sendResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("smsaero decode response: %w", err)
	}
	if !result.Success {
		return fmt.Errorf("smsaero rejected: %s", result.Message)
	}
	return nil
}
