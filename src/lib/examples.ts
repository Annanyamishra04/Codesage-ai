import type { SupportedLanguage } from "@/types/review";

export const EXAMPLE_SNIPPETS: Record<SupportedLanguage, string> = {
  javascript: `function getUserData(userId) {
  var apiKey = "EXAMPLE_API_KEY_NOT_REAL";
  console.log("fetching user", userId);

  if (userId == null) {
    return null;
  }

  let result;
  for (var i = 0; i < 1000; i++) {
    result = expensiveTransform(userId, config.multiplier);
  }

  try {
    return JSON.parse(fetchSync(apiKey, userId));
  } catch (e) {
    return e;
  }
}

function expensiveTransform(id, multiplier) {
  return id * multiplier;
}`,

  typescript: `interface User {
  id: number;
  name: string;
}

function findUser(users: User[], id): User {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id == id) {
      return users[i];
    }
  }
}

export function processUsers(users: any) {
  console.log(users);
  return users.map(u => u.name.toUpperCase());
}`,

  python: `import os

def load_config(path):
    print("loading config from", path)
    f = open(path)
    data = eval(f.read())
    return data

def divide(a, b):
    try:
        return a / b
    except:
        pass

def get_secret():
    api_key = "EXAMPLE_API_KEY_NOT_REAL"
    return api_key
`,

  java: `import java.util.*;

public class UserService {
    // TODO: replace with real password hashing before launch
    public String password = "admin123";

    public User findUser(List<User> users, int id) {
        for (int i = 0; i < users.size(); i++) {
            if (users.get(i).getId() == id) {
                return users.get(i);
            }
        }
        return null;
    }

    public void printAll(List<User> users) {
        for (User u : users) {
            System.out.println(u.getName());
        }
    }
}`,

  cpp: `#include <iostream>
#include <vector>
using namespace std;

int findValue(vector<int> data, int target) {
    for (int i = 0; i <= data.size(); i++) {  // off-by-one bug
        if (data[i] == target) {
            return i;
        }
    }
    return -1;
}

int main() {
    vector<int> nums = {1, 2, 3, 4, 5};
    cout << findValue(nums, 6) << endl;
    return 0;
}`,

  go: `package main

import "fmt"

func Divide(a, b int) int {
	return a / b // no check for b == 0
}

func main() {
	// TODO: handle errors properly
	result := Divide(10, 0)
	fmt.Println(result)
}`,

  sql: `SELECT * FROM users WHERE email = '" + userEmail + "';

DELETE FROM sessions;

UPDATE accounts SET balance = balance - 100 WHERE user_id = 42;
`,
};
