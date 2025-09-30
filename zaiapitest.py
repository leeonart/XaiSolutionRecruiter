from openai import OpenAI

client = OpenAI(
    api_key="0e3b330cc18d4012a80cb77820ebeb05.awcYBkPCxg3nlwUe",
    base_url="https://api.z.ai/api/paas/v4/"
)

completion = client.chat.completions.create(
    model="glm-4-32b-0414-128k",
    messages=[
        {"role": "system", "content": "You are a smart and creative novelist"},
        {"role": "user", "content": "Please write a short fairy tale story as a fairy tale master"}
    ]
)

print(completion.choices[0].message.content)