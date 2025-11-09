// lib/models/study.dart (ajout d'instructions)
class Study {
  final String id;
  final String name;
  final String description;
  final String machineType;
  final int expectedParticipants;
  final int sessionsPerParticipant;
  final int runsPerSession;
  final String runType;
  final int? approximateRunDurationMs;
  int completedParticipants;

  // Nouvelles propriétés pour les instructions
  List<String> preparationInstructions; // Instructions avant la session
  List<String> duringExperimentInstructions; // Instructions pendant le run
  List<String> postExperimentInstructions; // Instructions après la session

  Study({
    required this.id,
    required this.name,
    required this.description,
    required this.machineType,
    required this.expectedParticipants,
    required this.sessionsPerParticipant,
    required this.runsPerSession,
    required this.runType,
    this.approximateRunDurationMs,
    this.completedParticipants = 0,
    this.preparationInstructions = const [], // Initialisation par défaut
    this.duringExperimentInstructions = const [],
    this.postExperimentInstructions = const [],
  });
}