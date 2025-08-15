--[[
    EXTREMELY MASSIVE LUA SCRIPT
    Advanced Lua features and techniques
--]]

-- Set random seed for reproducibility
math.randomseed(os.time())

-------------------------------------
-- 1. ADVANCED OBJECT-ORIENTED PROGRAMMING
-------------------------------------

-- Class implementation using closures
local function Animal(name, sound)
    local self = {
        name = name,
        sound = sound,
        energy = 100
    }
    
    local methods = {}
    
    function methods:makeSound()
        self.energy = self.energy - 5
        return string.format("%s says '%s!' (Energy: %d)", self.name, self.sound, self.energy)
    end
    
    function methods:eat(food, amount)
        amount = amount or 10
        self.energy = self.energy + amount
        return string.format("%s ate %s and gained %d energy", self.name, food, amount)
    end
    
    function methods:getEnergy()
        return self.energy
    end
    
    function methods:setEnergy(value)
        self.energy = math.max(0, math.min(100, value))
    end
    
    return setmetatable(self, {
        __index = methods,
        __tostring = function(t)
            return string.format("Animal[name=%s, sound=%s, energy=%d]", 
                t.name, t.sound, t.energy)
        end,
        __call = function(t)
            return t:makeSound()
        end
    })
end

-- Inheritance
local function Dog(name, breed)
    local self = Animal(name, "Woof")
    self.breed = breed
    
    local methods = getmetatable(self).__index
    
    -- Override method
    function methods:makeSound()
        self.energy = self.energy - 3
        return string.format("%s the %s barks loudly! (Energy: %d)", 
            self.name, self.breed, self.energy)
    end
    
    -- New method
    function methods:fetch(item)
        self.energy = self.energy - 8
        return string.format("%s fetched the %s", self.name, item)
    end
    
    return self
end

print("\n=== OOP Examples ===")
local cat = Animal("Whiskers", "Meow")
print(cat)
print(cat:makeSound())
print(cat:eat("tuna", 15))
print(cat())

local labrador = Dog("Buddy", "Labrador")
print(labrador)
print(labrador:makeSound())
print(labrador:fetch("stick"))
print(labrador:eat("kibble"))

-------------------------------------
-- 2. TABLE SERIALIZATION
-------------------------------------

local function serializeTable(val, name, skipnewlines, depth)
    skipnewlines = skipnewlines or false
    depth = depth or 0
    
    local tmp = string.rep(" ", depth)
    
    if name then 
        if type(name) == "number" then
            tmp = tmp .. "[" .. name .. "] = " 
        else
            tmp = tmp .. name .. " = " 
        end
    end
    
    if type(val) == "table" then
        tmp = tmp .. "{" .. (not skipnewlines and "\n" or "")
        
        local first = true
        for k, v in pairs(val) do
            if not first then
                tmp = tmp .. "," .. (not skipnewlines and "\n" or "")
            end
            first = false
            
            tmp = tmp .. serializeTable(v, k, skipnewlines, depth + 1)
        end
        
        tmp = tmp .. (not skipnewlines and "\n" .. string.rep(" ", depth) or "") .. "}"
    elseif type(val) == "number" then
        tmp = tmp .. tostring(val)
    elseif type(val) == "string" then
        tmp = tmp .. string.format("%q", val)
    elseif type(val) == "boolean" then
        tmp = tmp .. (val and "true" or "false")
    else
        tmp = tmp .. '"' .. tostring(val) .. '"'
    end
    
    return tmp
end

local function deserializeTable(str)
    local chunk, err = load("return " .. str)
    if not chunk then return nil, err end
    return chunk()
end

print("\n=== Serialization Examples ===")
local complexTable = {
    name = "Test Table",
    data = {
        1, 2, 3,
        nested = {
            a = "A",
            b = "B",
            active = true
        }
    },
    [10] = "ten",
    func = function() return "I'm a function" end
}

-- Remove the function as it can't be serialized
complexTable.func = nil

local serialized = serializeTable(complexTable)
print("Serialized table:")
print(serialized)

local deserialized = deserializeTable(serialized)
print("\nDeserialized table key 'name':", deserialized.name)

-------------------------------------
-- 3. ADVANCED PATTERN MATCHING
-------------------------------------

local text = [[
User: Alice
Email: alice@example.com
Age: 30
Country: USA

User: Bob
Email: bob@example.org
Age: 25
Country: UK

User: Charlie
Email: charlie@example.net
Age: 35
Country: Canada
]]

print("\n=== Pattern Matching Examples ===")

-- Extract all email addresses
print("Email addresses:")
for email in text:gmatch("Email: ([%w%.%-]+@[%w%.%-]+)") do
    print("- " .. email)
end

-- Extract user data as tables
local users = {}
for name, email, age, country in text:gmatch(
    "User: (%a+)\nEmail: ([%w%.%-]+@[%w%.%-]+)\nAge: (%d+)\nCountry: (%a+)"
) do
    table.insert(users, {
        name = name,
        email = email,
        age = tonumber(age),
        country = country
    })
end

print("\nParsed user data:")
for i, user in ipairs(users) do
    print(string.format("%d. %s (%s), %d, %s", 
        i, user.name, user.email, user.age, user.country))
end

-- String manipulation
local html = "<div class='header'><h1>Title</h1></div>"
local stripped = html:gsub("<[^>]+>", "")
print("\nHTML stripped:", stripped)

-------------------------------------
-- 4. FUNCTIONAL PROGRAMMING
-------------------------------------

local function map(tbl, f)
    local t = {}
    for i, v in ipairs(tbl) do
        t[i] = f(v)
    end
    return t
end

local function filter(tbl, f)
    local t = {}
    for i, v in ipairs(tbl) do
        if f(v) then
            table.insert(t, v)
        end
    end
    return t
end

local function reduce(tbl, f, init)
    local acc = init
    for i, v in ipairs(tbl) do
        acc = f(acc, v)
    end
    return acc
end

local numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

print("\n=== Functional Programming Examples ===")

-- Map: square all numbers
local squares = map(numbers, function(x) return x * x end)
print("Squares:", table.concat(squares, ", "))

-- Filter: even numbers only
local evens = filter(numbers, function(x) return x % 2 == 0 end)
print("Evens:", table.concat(evens, ", "))

-- Reduce: sum all numbers
local sum = reduce(numbers, function(a, b) return a + b end, 0)
print("Sum:", sum)

-- Composition
local function compose(f, g)
    return function(...)
        return f(g(...))
    end
end

local double = function(x) return x * 2 end
local increment = function(x) return x + 1 end
local doubleThenIncrement = compose(increment, double)

print("5 doubled then incremented:", doubleThenIncrement(5))

-------------------------------------
-- 5. BENCHMARKING AND OPTIMIZATION
-------------------------------------

local function benchmark(f, iterations, name)
    iterations = iterations or 100000
    name = name or "function"
    
    local start = os.clock()
    for i = 1, iterations do
        f()
    end
    local elapsed = os.clock() - start
    
    print(string.format("Benchmark %s: %d iterations in %.4f seconds (%.2f/sec)", 
        name, iterations, elapsed, iterations / elapsed))
end

print("\n=== Benchmarking Examples ===")

-- Test local vs global access
local localVar = math.pi
globalVar = math.pi

benchmark(function()
    local x = localVar * 2
end, 1e6, "local variable access")

benchmark(function()
    local x = globalVar * 2
end, 1e6, "global variable access")

-- Test table insertion methods
local smallTable = {}
benchmark(function()
    for i = 1, 100 do
        smallTable[i] = i
    end
    for i = 1, 100 do
        smallTable[i] = nil
    end
end, 1000, "small table insert/delete")

local preallocated = {}
for i = 1, 100 do preallocated[i] = true end

benchmark(function()
    for i = 1, 100 do
        preallocated[i] = i
    end
    for i = 1, 100 do
        preallocated[i] = nil
    end
end, 1000, "preallocated table insert/delete")

-------------------------------------
-- 6. ADVANCED COROUTINES
-------------------------------------

local function asyncTask(name, steps, delay)
    return coroutine.create(function()
        for i = 1, steps do
            print(string.format("%s: Step %d/%d", name, i, steps))
            coroutine.yield()
            if delay then os.execute("sleep " .. tonumber(delay)) end
        end
        return name .. " completed"
    end)
end

print("\n=== Advanced Coroutine Examples ===")

local tasks = {
    asyncTask("Task A", 5),
    asyncTask("Task B", 3),
    asyncTask("Task C", 4)
}

local completed = 0
while completed < #tasks do
    completed = 0
    for i, task in ipairs(tasks) do
        if coroutine.status(task) ~= "dead" then
            local success, result = coroutine.resume(task)
            if coroutine.status(task) == "dead" then
                print(result)
                completed = completed + 1
            end
        else
            completed = completed + 1
        end
    end
end

-------------------------------------
-- 7. SANDBOXING AND ENVIRONMENTS
-------------------------------------

local function createSandbox()
    local env = {
        print = print,
        math = math,
        string = string,
        table = table,
        tonumber = tonumber,
        tostring = tostring,
        ipairs = ipairs,
        pairs = pairs,
        -- Limited IO
        io = {
            write = io.write,
            read = io.read
        },
        -- No access to os, debug, package, etc.
    }
    
    setmetatable(env, {
        __index = function(_, k)
            error("Attempt to access restricted global: " .. tostring(k))
        end,
        __newindex = function(_, k, v)
            error("Attempt to create new global: " .. tostring(k))
        end
    })
    
    return env
end

print("\n=== Sandbox Example ===")

local sandboxCode = [[
local a = 10
local b = 20
print("a + b =", a + b)
print("math.sqrt(144) =", math.sqrt(144))
-- This would error:
-- os.execute("rm -rf /")
]]

local sandboxEnv = createSandbox()
local chunk, err = load(sandboxCode, "sandbox", "t", sandboxEnv)
if not chunk then
    print("Compilation error:", err)
else
    local status, err = pcall(chunk)
    if not status then
        print("Runtime error:", err)
    end
end

-------------------------------------
-- 8. BIT OPERATIONS (Lua 5.3+)
-------------------------------------

if _VERSION >= "Lua 5.3" then
    print("\n=== Bit Operations ===")
    
    local function bits(x)
        return string.format("%8b", x):gsub(" ", "0")
    end
    
    local a = 0b11001100
    local b = 0b10101010
    
    print("a     =", bits(a))
    print("b     =", bits(b))
    print("a & b =", bits(a & b))
    print("a | b =", bits(a | b))
    print("a ~ b =", bits(a ~ b))
    print("~a    =", bits(~a & 0xFF))
    print("a >> 2=", bits(a >> 2))
    print("b << 1=", bits(b << 1))
    print("rol(a,1)=", bits((a << 1) | (a >> 7)))
    print("ror(b,2)=", bits((b >> 2) | (b << 6) & 0xFF))
end

-------------------------------------
-- 9. RANDOM DATA GENERATION
-------------------------------------

local function randomString(length)
    local chars = {}
    for i = 1, length do
        local r = math.random(1, 3)
        if r == 1 then
            chars[i] = string.char(math.random(65, 90)) -- A-Z
        elseif r == 2 then
            chars[i] = string.char(math.random(97, 122)) -- a-z
        else
            chars[i] = string.char(math.random(48, 57)) -- 0-9
        end
    end
    return table.concat(chars)
end

local function generateRandomPerson()
    local firstNames = {"Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace"}
    local lastNames = {"Smith", "Johnson", "Williams", "Brown", "Jones", "Miller"}
    
    return {
        firstName = firstNames[math.random(1, #firstNames)],
        lastName = lastNames[math.random(1, #lastNames)],
        age = math.random(18, 65),
        email = string.format("%s%d@%s", 
            string.lower(firstNames[math.random(1, #firstNames)]),
            math.random(100, 999),
            {"example.com", "test.org", "demo.net"}[math.random(1, 3)]),
        id = randomString(8)
    }
end

print("\n=== Random Data Generation ===")
for i = 1, 3 do
    local person = generateRandomPerson()
    print(string.format("%s %s (%d) - %s - ID: %s",
        person.firstName, person.lastName, 
        person.age, person.email, person.id))
end

-------------------------------------
-- 10. FINAL SYSTEM INFO
-------------------------------------

print("\n=== System Information ===")
print("Lua version:", _VERSION)
print("Current time:", os.date("%Y-%m-%d %H:%M:%S"))
print("Working directory:", io.popen("cd"):read("*a"):gsub("\n", ""))
print("CPU cores:", tonumber(io.popen("nproc"):read("*a")) or "unknown")

collectgarbage()
local mem = collectgarbage("count")
print(string.format("Memory used: %.2f KB", mem))

print("\nScript execution complete!")
