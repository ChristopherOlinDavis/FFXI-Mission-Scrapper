// FFXI Mission Models
// Generated from FFXI Mission Scraper data
// Compatible with Swift 5.0+

import Foundation

// MARK: - Root API Response
struct MissionAPIResponse: Codable {
    let version: String
    let generatedAt: String
    let missionSets: [MissionSet]
    let stats: APIStats
}

struct APIStats: Codable {
    let totalSets: Int
    let totalMissions: Int
    let totalNodes: Int
}

// MARK: - Mission Set
struct MissionSet: Codable, Identifiable {
    let id: String
    let name: String
    let category: String
    let sourceUrl: String
    let lastScraped: String
    let missions: [Mission]
    let quests: [Quest]? // WotG only
    let stats: MissionSetStats?

    var totalMissions: Int {
        missions.count
    }

    var totalQuests: Int {
        quests?.count ?? 0
    }

    var hasQuests: Bool {
        quests != nil && !quests!.isEmpty
    }
}

// MARK: - Mission Set Stats
struct MissionSetStats: Codable {
    let totalMissions: Int
    let totalQuests: Int?
    let totalQuestVariants: Int?
}

// MARK: - Mission
struct Mission: Codable, Identifiable {
    let id: String
    let title: String
    let number: String?
    let nodes: [MissionNode]
    let gates: [MissionGate]
    let metadata: MissionMetadata?
}

// MARK: - Mission Node
struct MissionNode: Codable, Identifiable {
    let id: String
    let orderIndex: Int
    let title: String
    let description: String
    let dependencies: [String]
    let location: Location?

    var hasLocation: Bool {
        location != nil
    }
}

// MARK: - Location
struct Location: Codable {
    let coordinates: String?
    let zone: String?
    let npc: String?

    var displayText: String {
        var parts: [String] = []
        if let zone = zone {
            parts.append(zone)
        }
        if let coords = coordinates {
            parts.append("(\(coords))")
        }
        if let npc = npc {
            parts.append(npc)
        }
        return parts.joined(separator: " ")
    }
}

// MARK: - Mission Gate (for branching missions)
struct MissionGate: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    let description: String
    let choices: [GateChoice]
}

struct GateChoice: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let nextNodeId: String
}

// MARK: - Mission Metadata
struct MissionMetadata: Codable {
    let category: String?
    let missionSet: String?
    let minLevel: Int?
    let difficulty: String?
    let rewards: [String]?
    let questPrerequisite: String?
    let nationSpecificQuest: NationSpecificQuest?
}

// MARK: - Quest (WotG only)
struct Quest: Codable, Identifiable {
    let id: String
    let number: String
    let title: String
    let type: String // "quest"
    let variants: [QuestVariant]

    /// Get variant for specific nation
    func variant(for nation: String) -> QuestVariant? {
        variants.first { $0.nation.lowercased() == nation.lowercased() }
    }

    /// Get all nation names that have variants
    var availableNations: [String] {
        variants.map { $0.nation }
    }
}

// MARK: - Quest Variant
struct QuestVariant: Codable, Identifiable {
    let nation: String // "bastok", "sandoria", "windurst"
    let title: String
    let nodes: [MissionNode]
    let metadata: MissionMetadata

    var id: String {
        "\(nation)-\(title)"
    }
}

// MARK: - Nation Specific Quest (for WotG - DEPRECATED, use Quest instead)
struct NationSpecificQuest: Codable {
    let bastok: String
    let sandoria: String
    let windurst: String
    let rewards: String?

    /// Get quest name for a specific nation
    func quest(for nation: String) -> String? {
        switch nation.lowercased() {
        case "bastok": return bastok
        case "san d'oria", "sandoria": return sandoria
        case "windurst": return windurst
        default: return nil
        }
    }
}

// MARK: - Helper Extensions

extension MissionSet {
    /// Get missions filtered by number pattern (e.g., "1-1", "2-3")
    func missions(withNumberPrefix prefix: String) -> [Mission] {
        missions.filter { mission in
            guard let number = mission.number else { return false }
            return number.hasPrefix(prefix)
        }
    }

    /// Get all missions in a specific zone
    func missions(inZone zone: String) -> [Mission] {
        missions.filter { mission in
            mission.nodes.contains { node in
                node.location?.zone?.lowercased() == zone.lowercased()
            }
        }
    }
}

extension Mission {
    /// Get the starting node (first node with no dependencies)
    var startNode: MissionNode? {
        nodes.first { $0.dependencies.isEmpty }
    }

    /// Get all unique zones mentioned in this mission
    var zones: [String] {
        let allZones = nodes.compactMap { $0.location?.zone }
        return Array(Set(allZones)).sorted()
    }

    /// Get node by ID
    func node(withId id: String) -> MissionNode? {
        nodes.first { $0.id == id }
    }

    /// Get nodes that depend on a specific node
    func dependentNodes(of nodeId: String) -> [MissionNode] {
        nodes.filter { $0.dependencies.contains(nodeId) }
    }
}

extension MissionNode {
    /// Check if this node can be started (all dependencies met)
    func canStart(completedNodeIds: Set<String>) -> Bool {
        dependencies.allSatisfy { completedNodeIds.contains($0) }
    }
}

extension Quest {
    /// Check if quest is fully complete (all 3 variants done)
    func isFullyComplete(completedVariants: Set<String>) -> Bool {
        variants.allSatisfy { variant in
            completedVariants.contains("\(id)-\(variant.nation)")
        }
    }

    /// Get completion percentage (0.0 to 1.0)
    func completionPercentage(completedVariants: Set<String>) -> Double {
        let completedCount = variants.filter { variant in
            completedVariants.contains("\(id)-\(variant.nation)")
        }.count
        return Double(completedCount) / Double(variants.count)
    }

    /// Get uncompleted nations
    func uncompletedNations(completedVariants: Set<String>) -> [String] {
        variants.filter { variant in
            !completedVariants.contains("\(id)-\(variant.nation)")
        }.map { $0.nation }
    }
}

// MARK: - Example Usage

/*
// Loading the API response
let url = Bundle.main.url(forResource: "api-response", withExtension: "json")!
let data = try Data(contentsOf: url)
let decoder = JSONDecoder()
let apiResponse = try decoder.decode(MissionAPIResponse.self, from: data)

// Working with mission sets
let bastokMissions = apiResponse.missionSets.first { $0.id == "bastok-rank" }

// Finding a specific mission
let zeruhnReport = bastokMissions?.missions.first { $0.title == "The Zeruhn Report" }

// Checking node dependencies
let completedNodes: Set<String> = ["bastok-rank-the-zeruhn-report-node-1"]
let nextNodes = zeruhnReport?.nodes.filter { $0.canStart(completedNodeIds: completedNodes) }

// Filtering by location
let bastokMinesMissions = bastokMissions?.missions(inZone: "Bastok Mines")

// --- WotG Quest Tracking ---

// Load WotG mission set
let wotg = apiResponse.missionSets.first { $0.id == "wotg" }

// Check if WotG has quests
if wotg?.hasQuests == true {
    let quests = wotg!.quests!

    // Get Quest 5 (required for mission 4)
    let quest5 = quests.first { $0.number == "5" }

    // Get specific nation variant
    let bastokVariant = quest5?.variant(for: "bastok")
    // bastokVariant.title = "Burden of Suspicion"

    // Track completion (store in UserDefaults or database)
    var completedQuestVariants: Set<String> = [
        "wotg-quest-5-bastok",
        "wotg-quest-5-sandoria"
    ]

    // Check quest completion
    if let quest5 = quest5 {
        let percentage = quest5.completionPercentage(completedVariants: completedQuestVariants)
        // percentage = 0.666 (2 out of 3 complete)

        let isFullyComplete = quest5.isFullyComplete(completedVariants: completedQuestVariants)
        // isFullyComplete = false

        let remaining = quest5.uncompletedNations(completedVariants: completedQuestVariants)
        // remaining = ["windurst"]
    }

    // Check if mission is unlocked
    let mission4 = wotg?.missions.first { $0.number == "4" }
    if let prereqId = mission4?.metadata?.questPrerequisite {
        // prereqId = "wotg-quest-5"
        // Check if player has completed at least one variant
        let hasCompletedPrereq = completedQuestVariants.contains { $0.hasPrefix(prereqId) }
    }
}
*/
