import TheFadeItemModel from "./base.mjs";
import { WeaponData, ArmorData } from "./equipment.mjs";
import { SpellData, ItemOfPowerData } from "./magic.mjs";
import {
    PathData, SpeciesData, MonsterSpeciesData, TalentData, TraitData, PreceptData, SkillData
} from "./character-options.mjs";
import {
    GenericItemData, TravelData, MusicalData, ClothingData, PotionData, DrugData, PoisonData, MedicalData,
    AlchemicalData, StaffData, WandData, GateData, CommunicationData, ContainmentData, DreamData,
    MountData, VehicleData, BiologicalData, FleshcraftData
} from "./gear.mjs";
import { DiseaseData, MutationData, HeritageData, TrapData, HazardData, DowntimeData } from "./rules-items.mjs";

/** Item type → system data model. */
export const ITEM_MODELS = {
    weapon: WeaponData,
    armor: ArmorData,
    clothing: ClothingData,
    magicitem: ItemOfPowerData,
    item: GenericItemData,
    travel: TravelData,
    musical: MusicalData,
    potion: PotionData,
    drug: DrugData,
    poison: PoisonData,
    medical: MedicalData,
    alchemical: AlchemicalData,
    staff: StaffData,
    wand: WandData,
    gate: GateData,
    communication: CommunicationData,
    containment: ContainmentData,
    dream: DreamData,
    mount: MountData,
    vehicle: VehicleData,
    biological: BiologicalData,
    fleshcraft: FleshcraftData,
    skill: SkillData,
    talent: TalentData,
    trait: TraitData,
    precept: PreceptData,
    species: SpeciesData,
    monsterspecies: MonsterSpeciesData,
    path: PathData,
    monsterpath: PathData,
    spell: SpellData,
    disease: DiseaseData,
    mutation: MutationData,
    heritage: HeritageData,
    trap: TrapData,
    hazard: HazardData,
    downtime: DowntimeData
};

export { TheFadeItemModel };
